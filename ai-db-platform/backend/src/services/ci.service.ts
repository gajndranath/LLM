import crypto from 'crypto';
import { dbQuery } from '../config/database';

export interface MigrationFinding {
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  code: string;
  message: string;
  line?: number;
  statement: string;
  remediation: string;
}

export interface CIAuditResult {
  passed: boolean;
  score: number; // 0 - 100
  totalStatements: number;
  criticalIssues: number;
  warnings: number;
  findings: MigrationFinding[];
  remediationPatch?: string;
  auditId: string;
  timestamp: string;
}

export class CIMigrationService {
  /**
   * Main audit pipeline for CI/CD SQL migration files.
   */
  public static async auditMigrationSQL(
    sqlContent: string,
    repository?: string,
    pullRequest?: string
  ): Promise<CIAuditResult> {
    const findings: MigrationFinding[] = [];
    const safePatches: string[] = [];

    // 1. Sanitize & Tokenize DDL statements (O(1) memory strip of bulk data inserts)
    const statements = this.extractDDLStatements(sqlContent);
    let deduction = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (!stmt) continue;

      const upper = stmt.toUpperCase();

      // Check 1: Destructive DROP TABLE / DROP COLUMN
      if (/^DROP\s+TABLE/i.test(upper) || /ALTER\s+TABLE\s+.*\s+DROP\s+COLUMN/i.test(upper)) {
        deduction += 35;
        findings.push({
          severity: 'CRITICAL',
          code: 'DESTRUCTIVE_DDL',
          message: 'Destructive DROP statement detected. This will cause irreversible production data loss.',
          statement: stmt,
          remediation: 'Deprecate column/table in application logic first. Use soft-deletion or non-destructive views before dropping in a future major release.'
        });
      }

      // Check 2: Destructive TRUNCATE
      if (/^TRUNCATE\s+/i.test(upper)) {
        deduction += 40;
        findings.push({
          severity: 'CRITICAL',
          code: 'DATA_PURGE_TRUNCATE',
          message: 'TRUNCATE statement detected in migration. Immediate wipeout of all table rows.',
          statement: stmt,
          remediation: 'Remove TRUNCATE from automated migration pipeline.'
        });
      }

      // Check 3: Non-Concurrent Index Creation (Locks table writes on large tables)
      if (/^CREATE\s+(UNIQUE\s+)?INDEX\s+/i.test(upper) && !upper.includes('CONCURRENTLY')) {
        deduction += 15;
        const concurrentFix = stmt.replace(/^CREATE\s+(UNIQUE\s+)?INDEX/i, (match) => {
          return match.toUpperCase().includes('UNIQUE') ? 'CREATE UNIQUE INDEX CONCURRENTLY' : 'CREATE INDEX CONCURRENTLY';
        });
        findings.push({
          severity: 'WARNING',
          code: 'HIGH_LOCK_INDEX',
          message: 'Non-concurrent index creation detected. In production, this acquires an EXCLUSIVE table lock blocking writes.',
          statement: stmt,
          remediation: `Use CONCURRENTLY keyword: \`${concurrentFix}\``
        });
        safePatches.push(concurrentFix);
      }

      // Check 4: Missing IF NOT EXISTS on new tables
      if (/^CREATE\s+TABLE\s+/i.test(upper) && !upper.includes('IF NOT EXISTS')) {
        deduction += 5;
        const ifNotExistsFix = stmt.replace(/^CREATE\s+TABLE\s+/i, 'CREATE TABLE IF NOT EXISTS ');
        findings.push({
          severity: 'INFO',
          code: 'IDEMPOTENCY_WARNING',
          message: 'Table creation lacks IF NOT EXISTS. Re-running migration will fail.',
          statement: stmt,
          remediation: `Add IF NOT EXISTS: \`${ifNotExistsFix}\``
        });
        safePatches.push(ifNotExistsFix);
      }

      // Check 5: Adding NOT NULL Column without a DEFAULT value
      if (/ALTER\s+TABLE\s+.*\s+ADD\s+COLUMN\s+.*\s+NOT\s+NULL/i.test(upper) && !upper.includes('DEFAULT')) {
        deduction += 20;
        findings.push({
          severity: 'WARNING',
          code: 'NOT_NULL_NO_DEFAULT',
          message: 'Adding NOT NULL column without a DEFAULT value will fail if existing rows exist.',
          statement: stmt,
          remediation: 'Provide a DEFAULT value or add as NULL first, backfill data, then set NOT NULL.'
        });
      }
    }

    const score = Math.max(0, 100 - deduction);
    const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
    const warningCount = findings.filter(f => f.severity === 'WARNING').length;
    const passed = criticalCount === 0 && score >= 75;
    const auditId = 'ci_' + crypto.randomBytes(8).toString('hex');

    return {
      passed,
      score,
      totalStatements: statements.length,
      criticalIssues: criticalCount,
      warnings: warningCount,
      findings,
      remediationPatch: safePatches.length > 0 ? safePatches.join(';\n') + ';' : undefined,
      auditId,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Separates SQL script by statements while stripping bulk insert rows.
   */
  private static extractDDLStatements(sql: string): string[] {
    const rawStmts = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Filter to retain schema-modifying DDL commands (O(1) memory filtering against bulk inserts)
    return rawStmts.filter(stmt => {
      const u = stmt.toUpperCase();
      return (
        u.startsWith('CREATE') ||
        u.startsWith('ALTER') ||
        u.startsWith('DROP') ||
        u.startsWith('TRUNCATE') ||
        u.startsWith('COMMENT') ||
        u.startsWith('GRANT')
      );
    });
  }
}
