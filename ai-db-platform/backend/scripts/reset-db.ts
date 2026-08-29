/**
 * Database Reset Script
 * ══════════════════════════════════════════════════
 * CAUTION: This script DELETES all records except SUPER_ADMIN
 * 
 * Usage:
 *   npx ts-node scripts/reset-db.ts
 * 
 * What it does:
 * ✓ Keeps SUPER_ADMIN user intact
 * ✓ Deletes all organizations, users, connections, queries
 * ✓ Clears all architect audits/missions, design studio sessions
 * ✓ Preserves database schema and tables
 * ✓ Safe: respects foreign key constraints
 * 
 * After reset, you can:
 * → Create new users from scratch
 * → Add team members to organizations
 * → Create database connections
 * → Test AI agent tasks end-to-end
 */

import dotenv from 'dotenv';
dotenv.config();

import { Pool, PoolClient } from 'pg';
import * as readline from 'readline';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true }
    : { rejectUnauthorized: false },
});

// ═════════════════════════════════════════════════════════
// SAFETY: Confirm before destructive operation
// ═════════════════════════════════════════════════════════
async function confirmReset(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.log('\n⚠️  WARNING: This will DELETE all data except SUPER_ADMIN!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Tables that will be CLEARED:');
    console.log('  • session_messages');
    console.log('  • payment_transactions');
    console.log('  • plan_subscriptions');
    console.log('  • staff_invites');
    console.log('  • schema_mutations');
    console.log('  • architect_missions');
    console.log('  • architect_audits');
    console.log('  • design_studio_sessions');
    console.log('  • query_history');
    console.log('  • refresh_tokens');
    console.log('  • db_connections');
    console.log('  • verification_otps');
    console.log('  • organizations (except any linked to SUPER_ADMIN)');
    console.log('  • All USERS except SUPER_ADMIN\n');

    rl.question('Type "RESET" to confirm: ', (answer) => {
      rl.close();
      resolve(answer === 'RESET');
    });
  });
}

// ═════════════════════════════════════════════════════════
// MAIN: Reset Database
// ═════════════════════════════════════════════════════════
async function resetDatabase(): Promise<void> {
  let client: PoolClient | null = null;

  try {
    console.log('\n🔍 Connecting to database...');
    client = await pool.connect();
    console.log('✅ Connected!\n');

    // Get SUPER_ADMIN ID
    const superAdminResult = await client.query(
      "SELECT id, email FROM users WHERE role = 'SUPER_ADMIN'"
    );

    if (superAdminResult.rows.length === 0) {
      console.error('❌ No SUPER_ADMIN user found! Cannot proceed.');
      console.error('   Run: npm run db:seed');
      process.exit(1);
    }

    const superAdminId = superAdminResult.rows[0].id;
    const superAdminEmail = superAdminResult.rows[0].email;

    console.log(`✅ Found SUPER_ADMIN: ${superAdminEmail} (${superAdminId})`);
    console.log('   This user will be PRESERVED during reset\n');

    // Start transaction
    await client.query('BEGIN TRANSACTION');
    console.log('🔄 Starting transaction...\n');

    // ────────────────────────────────────────────────────────
    // STEP 1: Delete data with proper FK ordering
    // ────────────────────────────────────────────────────────

    console.log('🗑️  Clearing data (respecting foreign keys)...\n');

    // Session messages - no FK to other data
    await client.query('TRUNCATE TABLE session_messages CASCADE');
    console.log('   ✓ session_messages');

    // Payment transactions
    await client.query('TRUNCATE TABLE payment_transactions CASCADE');
    console.log('   ✓ payment_transactions');

    // Plan subscriptions
    await client.query('TRUNCATE TABLE plan_subscriptions CASCADE');
    console.log('   ✓ plan_subscriptions');

    // Staff invites
    await client.query('TRUNCATE TABLE staff_invites CASCADE');
    console.log('   ✓ staff_invites');

    // Schema mutations
    await client.query('DELETE FROM schema_mutations WHERE user_id != $1', [superAdminId]);
    console.log('   ✓ schema_mutations (except SUPER_ADMIN)');

    // Architect missions
    await client.query('DELETE FROM architect_missions WHERE user_id != $1', [superAdminId]);
    console.log('   ✓ architect_missions (except SUPER_ADMIN)');

    // Architect audits
    await client.query('DELETE FROM architect_audits WHERE user_id != $1', [superAdminId]);
    console.log('   ✓ architect_audits (except SUPER_ADMIN)');

    // Design studio sessions
    await client.query('DELETE FROM design_studio_sessions WHERE user_id != $1', [superAdminId]);
    console.log('   ✓ design_studio_sessions (except SUPER_ADMIN)');

    // Query history
    await client.query('DELETE FROM query_history WHERE user_id != $1', [superAdminId]);
    console.log('   ✓ query_history (except SUPER_ADMIN)');

    // Refresh tokens
    await client.query('DELETE FROM refresh_tokens WHERE user_id != $1', [superAdminId]);
    console.log('   ✓ refresh_tokens (except SUPER_ADMIN)');

    // DB connections
    await client.query('DELETE FROM db_connections WHERE user_id != $1', [superAdminId]);
    console.log('   ✓ db_connections (except SUPER_ADMIN)');

    // Verification OTPs
    await client.query('TRUNCATE TABLE verification_otps CASCADE');
    console.log('   ✓ verification_otps');

    // Organizations (delete all, SUPER_ADMIN has organization_id = NULL)
    await client.query('DELETE FROM organizations');
    console.log('   ✓ organizations');

    // Users - delete everyone except SUPER_ADMIN
    const deleteUsersResult = await client.query(
      "DELETE FROM users WHERE role != 'SUPER_ADMIN' RETURNING id, email, role"
    );
    console.log(`   ✓ users (deleted ${deleteUsersResult.rows.length} users)`);

    // ────────────────────────────────────────────────────────
    // STEP 2: Verify SUPER_ADMIN
    // ────────────────────────────────────────────────────────

    const verifyResult = await client.query(
      "SELECT id, name, email, role, organization_id, is_active FROM users WHERE role = 'SUPER_ADMIN'"
    );

    if (verifyResult.rows.length !== 1) {
      throw new Error('❌ SUPER_ADMIN verification failed!');
    }

    const admin = verifyResult.rows[0];
    console.log('\n✅ SUPER_ADMIN Verified:');
    console.log(`   • ID:              ${admin.id}`);
    console.log(`   • Email:           ${admin.email}`);
    console.log(`   • Name:            ${admin.name}`);
    console.log(`   • Role:            ${admin.role}`);
    console.log(`   • Organization ID: ${admin.organization_id || 'NULL (Platform-level)'}`);
    console.log(`   • Active:          ${admin.is_active ? '✓' : '✗'}`);

    // ────────────────────────────────────────────────────────
    // STEP 3: Get stats
    // ────────────────────────────────────────────────────────

    const stats = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM db_connections) as total_connections,
        (SELECT COUNT(*) FROM query_history) as total_queries,
        (SELECT COUNT(*) FROM architect_audits) as total_audits,
        (SELECT COUNT(*) FROM architect_missions) as total_missions,
        (SELECT COUNT(*) FROM design_studio_sessions) as total_sessions,
        (SELECT COUNT(*) FROM organizations) as total_orgs,
        (SELECT COUNT(*) FROM refresh_tokens) as total_tokens
    `);

    const stat = stats.rows[0];

    console.log('\n📊 Final State:');
    console.log(`   • Total Users:           ${stat.total_users}`);
    console.log(`   • Total Connections:     ${stat.total_connections}`);
    console.log(`   • Total Queries:         ${stat.total_queries}`);
    console.log(`   • Total Audits:          ${stat.total_audits}`);
    console.log(`   • Total Missions:        ${stat.total_missions}`);
    console.log(`   • Total Sessions:        ${stat.total_sessions}`);
    console.log(`   • Total Organizations:   ${stat.total_orgs}`);
    console.log(`   • Total Refresh Tokens:  ${stat.total_tokens}`);

    // Commit transaction
    await client.query('COMMIT');
    console.log('\n✅ TRANSACTION COMMITTED\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 DATABASE RESET SUCCESSFUL!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📝 Next Steps:');
    console.log(`   1. Login with SUPER_ADMIN: ${superAdminEmail}`);
    console.log('   2. Go to /super-admin dashboard');
    console.log('   3. Create a new organization');
    console.log('   4. Invite team members');
    console.log('   5. Add database connections');
    console.log('   6. Test AI agent tasks\n');

  } catch (err: any) {
    if (client) {
      try {
        await client.query('ROLLBACK');
        console.error('\n⚠️  Transaction rolled back due to error');
      } catch (rollbackErr) {
        console.error('Error during rollback:', rollbackErr);
      }
    }

    console.error('\n❌ Reset failed:', err.message);
    if (err.detail) console.error('Details:', err.detail);
    process.exit(1);

  } finally {
    if (client) client.release();
    await pool.end();
  }
}

// ═════════════════════════════════════════════════════════
// ENTRYPOINT
// ═════════════════════════════════════════════════════════
async function main(): Promise<void> {
  console.clear();
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  🔄 AI-DB Platform — Database Reset Tool           ║');
  console.log('║     Reset all data (keep SUPER_ADMIN)              ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const confirmed = await confirmReset();

  if (!confirmed) {
    console.log('\n❌ Reset cancelled. Database unchanged.\n');
    process.exit(0);
  }

  console.log('\n');
  await resetDatabase();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
