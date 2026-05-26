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

import { redisClient, getRedisStatus } from '../config/redis';
import { generateSchemaVisuals } from './ai-visuals.service';

// ── Extract Full Schema ────────────────────────────────────
export const extractSchema = async (
  pool: Pool,
  connectionIdOrIncludeVisuals?: string | boolean,
  includeVisualsFlag = false
): Promise<SchemaContext> => {
  let connectionId: string | undefined = undefined;
  let includeVisuals = includeVisualsFlag;

  if (typeof connectionIdOrIncludeVisuals === 'boolean') {
    includeVisuals = connectionIdOrIncludeVisuals;
  } else if (typeof connectionIdOrIncludeVisuals === 'string') {
    connectionId = connectionIdOrIncludeVisuals;
  }

  const cacheKey = connectionId ? `schema:cache:${connectionId}` : null;

  if (cacheKey && getRedisStatus()) {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn("[Schema Cache] Failed to read from Redis:", err);
    }
  }

  const [tables, columnsResult, indexesResult] = await Promise.all([
    getTables(pool),
    getAllColumns(pool),
    getAllIndexes(pool),
  ]);

  // Map columns by schema.table key for fast lookup
  const columnsMap = new Map<string, ColumnInfo[]>();
  columnsResult.forEach((row: any) => {
    const key = `${row.table_schema}.${row.table_name}`;
    if (!columnsMap.has(key)) {
      columnsMap.set(key, []);
    }
    columnsMap.get(key)!.push({
      column_name: row.column_name,
      data_type: row.data_type,
      is_nullable: row.is_nullable,
      column_default: row.column_default,
      is_primary_key: row.is_primary_key,
      is_foreign_key: row.is_foreign_key,
      foreign_table: row.foreign_table,
      foreign_column: row.foreign_column,
    });
  });

  // Map indexes by schema.table key for fast lookup
  const indexesMap = new Map<string, IndexInfo[]>();
  indexesResult.forEach((row: any) => {
    const key = `${row.table_schema}.${row.table_name}`;
    if (!indexesMap.has(key)) {
      indexesMap.set(key, []);
    }
    indexesMap.get(key)!.push({
      index_name: row.index_name,
      columns: row.columns,
      is_unique: row.is_unique,
      index_type: row.index_type,
    });
  });

  const enrichedTables: TableInfo[] = tables.map((table) => {
    const key = `${table.table_schema}.${table.table_name}`;
    return {
      table_name: table.table_name,
      table_schema: table.table_schema,
      row_estimate: table.row_estimate,
      columns: columnsMap.get(key) || [],
      indexes: indexesMap.get(key) || [],
    };
  });

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

  // Cache result for 5 minutes (300 seconds)
  if (cacheKey && getRedisStatus()) {
    try {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(schemaContext));
    } catch (err) {
      console.warn("[Schema Cache] Failed to write to Redis:", err);
    }
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
    const context = formatSchemaForPrompt(schema);
    return await generateSchemaVisuals(context);
  } catch (err) {
    console.error("AI Schema Visuals failed", err);
    return {};
  }
};

// ── Format Schema for LLM Prompt ──────────────────────────
export const formatSchemaForPrompt = (schema: SchemaContext, maxTables = 30): string => {
  // Prioritize tables based on relational importance
  const tablesWithScores = schema.tables.map((table) => {
    // 1. Outgoing foreign keys count
    const outgoingCount = table.columns.filter(col => col.is_foreign_key).length;

    // 2. Incoming foreign keys count (how many other tables reference this table)
    let incomingCount = 0;
    schema.tables.forEach((otherTable) => {
      otherTable.columns.forEach((otherCol) => {
        if (otherCol.is_foreign_key && otherCol.foreign_table === table.table_name) {
          incomingCount++;
        }
      });
    });

    // 3. Row estimate heuristic (larger or active tables are more important)
    const rowHeuristic = table.row_estimate > 0 ? Math.log10(table.row_estimate) : 0;

    // 4. Primary key existence
    const hasPk = table.columns.some(col => col.is_primary_key) ? 1 : 0;

    const score = (incomingCount * 3) + (outgoingCount * 2) + rowHeuristic + hasPk;

    return { table, score };
  });

  // Sort by score descending, then by schema/table name alphabetically
  tablesWithScores.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const nameA = `${a.table.table_schema}.${a.table.table_name}`;
    const nameB = `${b.table.table_schema}.${b.table.table_name}`;
    return nameA.localeCompare(nameB);
  });

  const prioritizedTables = tablesWithScores.map(ts => ts.table).slice(0, maxTables);

  return prioritizedTables.map((table) => {
    const cols = table.columns.map((col) => {
      const pkFlag = col.is_primary_key ? ' PK' : '';
      const fkFlag = col.is_foreign_key
        ? ` FK→${col.foreign_table}.${col.foreign_column}`
        : '';
      const nullable = col.is_nullable === 'YES' ? '' : ' NOT NULL';
      return `  ${col.column_name} ${col.data_type}${nullable}${pkFlag}${fkFlag}`;
    }).join('\n');

    const idxStr = table.indexes.length > 0
      ? `\n  -- Indexes: ${table.indexes.map((i) => {
          const rawCols = i.columns as any;
          const cols = Array.isArray(rawCols)
            ? rawCols
            : typeof rawCols === 'string'
              ? rawCols.replace(/[{}]/g, '').split(',').map((c: string) => c.trim())
              : [];
          return `${i.is_unique ? 'UNIQUE ' : ''}${i.index_name} (${cols.join(', ')})`;
        }).join(', ')}`
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

// ── Private: Get Columns for All User Tables ────────────────
const getAllColumns = async (pool: Pool): Promise<any[]> => {
  const result = await pool.query(`
    SELECT
      c.table_schema,
      c.table_name,
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
      SELECT ku.table_schema, ku.table_name, ku.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
        AND tc.table_schema = ku.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
    ) pk ON pk.table_schema = c.table_schema AND pk.table_name = c.table_name AND pk.column_name = c.column_name
    -- Foreign keys
    LEFT JOIN (
      SELECT
        ku.table_schema,
        ku.table_name,
        ku.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
    ) fk ON fk.table_schema = c.table_schema AND fk.table_name = c.table_name AND fk.column_name = c.column_name
    WHERE c.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
    ORDER BY c.table_schema, c.table_name, c.ordinal_position
  `);
  return result.rows;
};

// ── Private: Get Indexes for All User Tables ────────────────
const getAllIndexes = async (pool: Pool): Promise<any[]> => {
  const result = await pool.query(`
    SELECT
      t.relname AS table_name,
      n.nspname AS table_schema,
      i.relname AS index_name,
      array_agg(a.attname ORDER BY p.pos) AS columns,
      ix.indisunique AS is_unique,
      am.amname AS index_type
    FROM pg_index ix
    JOIN pg_class t ON t.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_am am ON am.oid = i.relam
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
    LEFT JOIN LATERAL (
      SELECT array_position(string_to_array(ix.indkey::text, ' ')::int[], a.attnum::int) AS pos
    ) p ON true
    WHERE n.nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
    GROUP BY t.relname, n.nspname, i.relname, ix.indisunique, am.amname
  `);
  return result.rows;
};
