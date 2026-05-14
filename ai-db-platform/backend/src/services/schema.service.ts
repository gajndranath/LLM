import { Pool } from 'pg';

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  foreign_table?: string;
  foreign_column?: string;
}

export interface TableInfo {
  table_name: string;
  table_schema: string;
  row_estimate: number;
  columns: ColumnInfo[];
  indexes: IndexInfo[];
}

export interface IndexInfo {
  index_name: string;
  columns: string[];
  is_unique: boolean;
  index_type: string;
}

export interface SchemaContext {
  tables: TableInfo[];
  totalTables: number;
  extractedAt: string;
  erd_mermaid?: string;
  dfd_mermaid?: string;
  flow_mermaid?: string;
}

// ── Extract Full Schema ────────────────────────────────────
export const extractSchema = async (pool: Pool, includeVisuals = false): Promise<SchemaContext> => {
  const tables = await getTables(pool);

  const enrichedTables = await Promise.all(
    tables.map(async (table) => {
      const [columns, indexes] = await Promise.all([
        getColumns(pool, table.table_schema, table.table_name),
        getIndexes(pool, table.table_schema, table.table_name),
      ]);
      return { ...table, columns, indexes };
    })
  );

  const schemaContext: SchemaContext = {
    tables: enrichedTables,
    totalTables: enrichedTables.length,
    extractedAt: new Date().toISOString(),
  };

  // 1. Generate basic ERD instantly
  schemaContext.erd_mermaid = generateBasicERD(enrichedTables);

  // 2. Generate AI DFD/Flow if requested (optional to save time/cost)
  if (includeVisuals) {
    const aiVisuals = await generateAISchemaVisuals(schemaContext);
    schemaContext.dfd_mermaid = aiVisuals.dfd_mermaid;
    schemaContext.flow_mermaid = aiVisuals.flow_mermaid;
    if (aiVisuals.erd_mermaid) schemaContext.erd_mermaid = aiVisuals.erd_mermaid;
  }

  return schemaContext;
};

const generateBasicERD = (tables: TableInfo[]): string => {
  let mermaid = 'erDiagram\n';
  tables.forEach(table => {
    mermaid += `  ${table.table_name} {\n`;
    table.columns.forEach(col => {
      const type = col.data_type.replace(/ /g, '_');
      const pk = col.is_primary_key ? ' PK' : '';
      mermaid += `    ${type} ${col.column_name}${pk}\n`;
    });
    mermaid += '  }\n';
  });

  tables.forEach(table => {
    table.columns.forEach(col => {
      if (col.is_foreign_key && col.foreign_table) {
        mermaid += `  ${table.table_name} }|--|| ${col.foreign_table} : "references"\n`;
      }
    });
  });
  return mermaid;
};

const generateAISchemaVisuals = async (schema: SchemaContext) => {
  try {
    const { generateSchemaVisuals } = require('./architect.service');
    const context = formatSchemaForPrompt(schema);
    return await generateSchemaVisuals(context);
  } catch (err) {
    console.error("AI Schema Visuals failed", err);
    return {};
  }
};

// ── Format Schema for LLM Prompt ──────────────────────────
export const formatSchemaForPrompt = (schema: SchemaContext, maxTables = 30): string => {
  const tables = schema.tables.slice(0, maxTables);

  return tables.map((table) => {
    const cols = table.columns.map((col) => {
      const pkFlag = col.is_primary_key ? ' PK' : '';
      const fkFlag = col.is_foreign_key
        ? ` FK→${col.foreign_table}.${col.foreign_column}`
        : '';
      const nullable = col.is_nullable === 'YES' ? '' : ' NOT NULL';
      return `  ${col.column_name} ${col.data_type}${nullable}${pkFlag}${fkFlag}`;
    }).join('\n');

    const idxStr = table.indexes.length > 0
      ? `\n  -- Indexes: ${table.indexes.map((i) => i.index_name).join(', ')}`
      : '';

    return `TABLE ${table.table_schema}.${table.table_name} (~${table.row_estimate} rows):\n${cols}${idxStr}`;
  }).join('\n\n');
};

// ── Private: Get Tables ────────────────────────────────────
const getTables = async (pool: Pool): Promise<Omit<TableInfo, 'columns' | 'indexes'>[]> => {
  const result = await pool.query(`
    SELECT
      t.table_name,
      t.table_schema,
      COALESCE(s.n_live_tup, 0)::bigint AS row_estimate
    FROM information_schema.tables t
    LEFT JOIN pg_stat_user_tables s
      ON s.schemaname = t.table_schema AND s.relname = t.table_name
    WHERE t.table_type = 'BASE TABLE'
      AND t.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
    ORDER BY t.table_schema, t.table_name
  `);
  return result.rows;
};

// ── Private: Get Columns ───────────────────────────────────
const getColumns = async (pool: Pool, schema: string, table: string): Promise<ColumnInfo[]> => {
  const result = await pool.query(`
    SELECT
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default,
      CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_primary_key,
      CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END AS is_foreign_key,
      fk.foreign_table_name AS foreign_table,
      fk.foreign_column_name AS foreign_column
    FROM information_schema.columns c
    -- Primary keys
    LEFT JOIN (
      SELECT ku.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
        AND tc.table_schema = ku.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = $1 AND tc.table_name = $2
    ) pk ON pk.column_name = c.column_name
    -- Foreign keys
    LEFT JOIN (
      SELECT
        ku.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = $1 AND tc.table_name = $2
    ) fk ON fk.column_name = c.column_name
    WHERE c.table_schema = $1 AND c.table_name = $2
    ORDER BY c.ordinal_position
  `, [schema, table]);

  return result.rows;
};

// ── Private: Get Indexes ───────────────────────────────────
const getIndexes = async (pool: Pool, schema: string, table: string): Promise<IndexInfo[]> => {
  const result = await pool.query(`
    SELECT
      i.relname AS index_name,
      array_agg(a.attname ORDER BY ix.indkey) AS columns,
      ix.indisunique AS is_unique,
      am.amname AS index_type
    FROM pg_index ix
    JOIN pg_class t ON t.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_am am ON am.oid = i.relam
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
    WHERE n.nspname = $1 AND t.relname = $2
    GROUP BY i.relname, ix.indisunique, am.amname
  `, [schema, table]);

  return result.rows;
};
