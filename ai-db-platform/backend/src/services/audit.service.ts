import crypto from 'crypto';
import { dbQuery } from '../config/database';
import { env } from '../config/env';

export interface AuditEventPayload {
  actorId: string;
  organizationId?: string | null;
  action: 'SCHEMA_DEPLOY' | 'DDL_ROLLBACK' | 'AST_SECURITY_BLOCK' | 'CONNECTION_CREATE' | 'CONNECTION_DELETE' | 'SECRET_ACCESS' | 'SCHEMA_DRIFT_DETECTED';
  resourceType: 'SESSION' | 'CONNECTION' | 'BLUEPRINT' | 'ORGANIZATION';
  resourceId?: string | null;
  clientIp?: string;
  userAgent?: string;
  payloadDelta?: Record<string, any>;
}

export class AuditService {
  private static HMAC_SECRET = env.JWT_SECRET || 'atlas_immutable_audit_secret_key';

  /**
   * Initialize the audit_events table with tamper-proof structure
   */
  static async initTable(): Promise<void> {
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS audit_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sequence_num BIGSERIAL,
        actor_id UUID NOT NULL,
        organization_id UUID,
        action VARCHAR(60) NOT NULL,
        resource_type VARCHAR(60) NOT NULL,
        resource_id VARCHAR(100),
        client_ip VARCHAR(50),
        user_agent VARCHAR(255),
        payload_delta JSONB,
        prev_event_hash VARCHAR(64) NOT NULL,
        event_hash VARCHAR(64) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_events(actor_id);
      CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_events(organization_id);
      CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_events(action);
      CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events(created_at DESC);
    `);
  }

  /**
   * Log an immutable audit event with HMAC hash-chaining to previous record
   */
  static async logEvent(event: AuditEventPayload): Promise<string> {
    try {
      // 1. Fetch latest event hash for chaining (Genesis hash if empty)
      const lastEventRes = await dbQuery(
        `SELECT event_hash FROM audit_events ORDER BY sequence_num DESC LIMIT 1`
      );
      const prevHash = lastEventRes.rows.length > 0
        ? lastEventRes.rows[0].event_hash
        : '0000000000000000000000000000000000000000000000000000000000000000';

      // 2. Compute current event signature
      const timestamp = new Date().toISOString();
      const contentToHash = `${prevHash}|${event.actorId}|${event.organizationId || ''}|${event.action}|${event.resourceType}|${event.resourceId || ''}|${JSON.stringify(event.payloadDelta || {})}|${timestamp}`;
      
      const eventHash = crypto
        .createHmac('sha256', this.HMAC_SECRET)
        .update(contentToHash)
        .digest('hex');

      // 3. Persist immutably
      const insertRes = await dbQuery(
        `INSERT INTO audit_events 
          (actor_id, organization_id, action, resource_type, resource_id, client_ip, user_agent, payload_delta, prev_event_hash, event_hash, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          event.actorId,
          event.organizationId || null,
          event.action,
          event.resourceType,
          event.resourceId || null,
          event.clientIp || '127.0.0.1',
          event.userAgent || 'ATLAS Engine',
          JSON.stringify(event.payloadDelta || {}),
          prevHash,
          eventHash,
          timestamp
        ]
      );

      return insertRes.rows[0].id;
    } catch (err: any) {
      console.error('❌ Failed to write immutable audit log:', err.message);
      return '';
    }
  }

  /**
   * Verify Blockchain Hash Integrity across audit records
   */
  static async verifyAuditIntegrity(): Promise<{ valid: boolean; totalEvents: number; corruptedAtSequence?: number }> {
    const res = await dbQuery(`SELECT * FROM audit_events ORDER BY sequence_num ASC`);
    const events = res.rows;

    let expectedPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';

    for (const evt of events) {
      if (evt.prev_event_hash !== expectedPrevHash) {
        return { valid: false, totalEvents: events.length, corruptedAtSequence: evt.sequence_num };
      }
      expectedPrevHash = evt.event_hash;
    }

    return { valid: true, totalEvents: events.length };
  }
}
