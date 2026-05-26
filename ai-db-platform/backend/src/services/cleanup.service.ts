import { dbQuery as query } from '../config/database';

/**
 * Periodically purges expired verification OTPs and refresh tokens from the database.
 */
export const startCleanupScheduler = () => {
  // Run cleanup every 1 hour
  const INTERVAL_MS = 60 * 60 * 1000;

  console.log('⏰ ATLAS: Initializing database cleanup scheduler...');

  const performCleanup = async () => {
    try {
      console.log('🧹 ATLAS Cleanup: Purging expired records...');

      // 1. Purge expired verification OTPs
      const otpResult = await query(
        'DELETE FROM verification_otps WHERE expires_at < NOW()'
      );
      if (otpResult.rowCount && otpResult.rowCount > 0) {
        console.log(`🧹 ATLAS Cleanup: Purged ${otpResult.rowCount} expired verification OTPs.`);
      }

      // 2. Purge expired refresh tokens
      const tokenResult = await query(
        'DELETE FROM refresh_tokens WHERE expires_at < NOW()'
      );
      if (tokenResult.rowCount && tokenResult.rowCount > 0) {
        console.log(`🧹 ATLAS Cleanup: Purged ${tokenResult.rowCount} expired refresh tokens.`);
      }

      // 3. Purge query history older than 30 days
      const historyResult = await query(
        "DELETE FROM query_history WHERE created_at < NOW() - INTERVAL '30 days'"
      );
      if (historyResult.rowCount && historyResult.rowCount > 0) {
        console.log(`🧹 [AUDIT] ATLAS Cleanup: Purged ${historyResult.rowCount} query history records older than 30 days.`);
      }

      // 4. Purge architect audits older than 30 days
      const auditResult = await query(
        "DELETE FROM architect_audits WHERE created_at < NOW() - INTERVAL '30 days'"
      );
      if (auditResult.rowCount && auditResult.rowCount > 0) {
        console.log(`🧹 [AUDIT] ATLAS Cleanup: Purged ${auditResult.rowCount} architect audit records older than 30 days.`);
      }
    } catch (error: any) {
      console.error('❌ ATLAS Cleanup: Failed to run database purge:', error.message);
    }
  };

  // Run immediately on bootstrap
  performCleanup();
  
  const timer = setInterval(performCleanup, INTERVAL_MS);
  timer.unref(); // Don't keep the event loop alive if the server is shutting down
};
