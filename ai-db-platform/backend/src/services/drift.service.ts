import crypto from 'crypto';
import { extractSchema, SchemaContext, TableInfo, ColumnInfo } from './schema.service';
import { getConnectionPool } from './connection.service';
import { dbQuery as query } from '../config/database';
import { AuditService } from './audit.service';

export interface ColumnDiff {
  name: string;
  type: string;
  isNullable?: boolean;
  status: 'ADDED' | 'REMOVED' | 'MODIFIED';
}

export interface TableDiff {
  tableName: string;
  status: 'ADDED' | 'REMOVED' | 'MODIFIED';
  columns: ColumnDiff[];
}

export interface SchemaDriftReport {
  connectionId: string;
  hasDrift: boolean;
  liveSchemaHash: string;
  expectedSchemaHash: string | null;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  tableDiffs: TableDiff[];
  summary: {
    addedTables: number;
    removedTables: number;
    modifiedTables: number;
  };
  detectedAt: string;
}

export class DriftDetectionService {
  /**
   * Generates a deterministic SHA-256 fingerprint from a schema snapshot.
   */
  public static calculateSchemaHash(schema: SchemaContext): string {
    const canonical = (schema.tables || [])
      .map((t: TableInfo) => ({
        name: t.table_name,
        columns: (t.columns || [])
          .map((c: ColumnInfo) => `${c.column_name}:${c.data_type}:${c.is_nullable}`)
          .sort()
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  }

  /**
   * Compares live database schema against stored platform blueprint.
   */
  public static async checkConnectionDrift(
    connectionId: string,
    userId: string
  ): Promise<SchemaDriftReport> {
    const pool = await getConnectionPool(connectionId, userId);
    const liveSchema: SchemaContext = await extractSchema(pool, true);
    const liveHash = this.calculateSchemaHash(liveSchema);

    // Fetch the last known deployed blueprint
    const lastSessionRes = await query(
      `SELECT current_design FROM design_studio_sessions 
       WHERE connection_id = $1 AND status = 'completed' AND current_design IS NOT NULL 
       ORDER BY updated_at DESC LIMIT 1`,
      [connectionId]
    );

    let expectedSchema: any = null;
    let expectedHash: string | null = null;

    if (lastSessionRes.rows.length > 0 && lastSessionRes.rows[0].current_design) {
      expectedSchema = lastSessionRes.rows[0].current_design;
      if (expectedSchema.entities) {
        const formatted: SchemaContext = {
          totalTables: expectedSchema.entities.length,
          extractedAt: new Date().toISOString(),
          tables: expectedSchema.entities.map((e: any): TableInfo => ({
            table_name: e.name,
            table_schema: 'public',
            row_estimate: 0,
            indexes: [],
            columns: (e.columns || []).map((c: any): ColumnInfo => ({
              column_name: c.name,
              data_type: c.type,
              is_nullable: c.nullable ? 'YES' : 'NO',
              column_default: null,
              is_primary_key: !!c.primary_key,
              is_foreign_key: false
            }))
          }))
        };
        expectedHash = this.calculateSchemaHash(formatted);
      }
    }

    // If no blueprint exists yet, baseline is established
    if (!expectedHash) {
      return {
        connectionId,
        hasDrift: false,
        liveSchemaHash: liveHash,
        expectedSchemaHash: null,
        riskLevel: 'LOW',
        tableDiffs: [],
        summary: { addedTables: 0, removedTables: 0, modifiedTables: 0 },
        detectedAt: new Date().toISOString()
      };
    }

    // Compare schemas
    const diffs = this.diffSchemas(expectedSchema, liveSchema);
    const hasDrift = diffs.tableDiffs.length > 0;

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (diffs.summary.removedTables > 0 || diffs.tableDiffs.some(t => t.columns.some(c => c.status === 'REMOVED'))) {
      riskLevel = 'HIGH';
    } else if (diffs.summary.modifiedTables > 0) {
      riskLevel = 'MEDIUM';
    }

    if (hasDrift) {
      // Record immutable SOC-2 Audit Event for Out-of-Band drift
      await AuditService.logEvent({
        actorId: userId,
        action: 'SCHEMA_DRIFT_DETECTED',
        resourceType: 'CONNECTION',
        resourceId: connectionId,
        clientIp: '127.0.0.1',
        payloadDelta: {
          liveHash,
          expectedHash,
          riskLevel,
          summary: diffs.summary
        }
      });
    }

    return {
      connectionId,
      hasDrift,
      liveSchemaHash: liveHash,
      expectedSchemaHash: expectedHash,
      riskLevel,
      tableDiffs: diffs.tableDiffs,
      summary: diffs.summary,
      detectedAt: new Date().toISOString()
    };
  }

  /**
   * Deterministic Graph Diff Calculator
   */
  private static diffSchemas(expectedDesign: any, liveSchema: SchemaContext) {
    const tableDiffs: TableDiff[] = [];
    const expectedEntities: any[] = expectedDesign?.entities || [];
    const liveTables: TableInfo[] = liveSchema?.tables || [];

    const expectedMap = new Map<string, any>(expectedEntities.map(e => [e.name, e]));
    const liveMap = new Map<string, TableInfo>(liveTables.map(t => [t.table_name, t]));

    let addedTables = 0;
    let removedTables = 0;
    let modifiedTables = 0;

    // Check for Added or Modified Tables in Live DB
    for (const [tableName, liveTable] of liveMap.entries()) {
      if (!expectedMap.has(tableName)) {
        addedTables++;
        tableDiffs.push({
          tableName,
          status: 'ADDED',
          columns: (liveTable.columns || []).map((c: ColumnInfo): ColumnDiff => ({
            name: c.column_name,
            type: c.data_type,
            status: 'ADDED'
          }))
        });
      } else {
        const expectedTable: any = expectedMap.get(tableName);
        const colDiffs: ColumnDiff[] = [];
        const expCols = new Map<string, any>((expectedTable.columns || []).map((c: any) => [c.name, c]));
        const liveCols = new Map<string, ColumnInfo>((liveTable.columns || []).map((c: ColumnInfo) => [c.column_name, c]));

        for (const [cName, lCol] of liveCols.entries()) {
          if (!expCols.has(cName)) {
            colDiffs.push({ name: cName, type: lCol.data_type, status: 'ADDED' });
          } else {
            const eCol: any = expCols.get(cName);
            if (eCol.type.toUpperCase() !== lCol.data_type.toUpperCase()) {
              colDiffs.push({ name: cName, type: `${eCol.type} -> ${lCol.data_type}`, status: 'MODIFIED' });
            }
          }
        }

        for (const [cName, eCol] of expCols.entries()) {
          if (!liveCols.has(cName)) {
            colDiffs.push({ name: cName, type: (eCol as any).type, status: 'REMOVED' });
          }
        }

        if (colDiffs.length > 0) {
          modifiedTables++;
          tableDiffs.push({
            tableName,
            status: 'MODIFIED',
            columns: colDiffs
          });
        }
      }
    }

    // Check for Dropped Tables in Live DB
    for (const [tableName, expectedTable] of expectedMap.entries()) {
      if (!liveMap.has(tableName)) {
        removedTables++;
        tableDiffs.push({
          tableName,
          status: 'REMOVED',
          columns: ((expectedTable as any).columns || []).map((c: any): ColumnDiff => ({
            name: c.name,
            type: c.type,
            status: 'REMOVED'
          }))
        });
      }
    }

    return {
      tableDiffs,
      summary: { addedTables, removedTables, modifiedTables }
    };
  }
}
