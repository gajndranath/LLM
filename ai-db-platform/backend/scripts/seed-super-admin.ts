/**
 * Seed Script: Create SUPER_ADMIN Account
 * ════════════════════════════════════════
 * Run ONCE after first deploy:
 *   npm run db:seed
 *
 * Required env vars:
 *   SUPER_ADMIN_EMAIL     — Your login email
 *   SUPER_ADMIN_PASSWORD  — Your password (min 8 chars, upper+lower+number)
 *   SUPER_ADMIN_NAME      — Your name (default: "Platform Owner")
 */

import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const SALT_ROUNDS = 12;

const seed = async () => {
  const email    = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name     = process.env.SUPER_ADMIN_NAME || 'Platform Owner';

  if (!email || !password) {
    console.error('❌ Missing SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD in .env');
    process.exit(1);
  }

  if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    console.error('❌ SUPER_ADMIN_PASSWORD must be at least 8 chars with upper, lower, and number');
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    // Guard: check if SUPER_ADMIN already exists
    const existing = await client.query(
      "SELECT id, email FROM users WHERE role = 'SUPER_ADMIN'"
    );

    if (existing.rows.length > 0) {
      console.log(`✅ SUPER_ADMIN already exists: ${existing.rows[0].email}`);
      console.log('   Skipping seed. To reset, manually delete the record and re-run.');
      process.exit(0);
    }

    // Create SUPER_ADMIN — no organization_id (they own the whole platform)
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await client.query(
      `INSERT INTO users (name, email, password_hash, role, organization_id)
       VALUES ($1, $2, $3, 'SUPER_ADMIN', NULL)
       RETURNING id, name, email, role, created_at`,
      [name, email.toLowerCase().trim(), passwordHash]
    );

    const admin = result.rows[0];
    console.log('\n🚀 SUPER_ADMIN created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   ID:      ${admin.id}`);
    console.log(`   Name:    ${admin.name}`);
    console.log(`   Email:   ${admin.email}`);
    console.log(`   Role:    ${admin.role}`);
    console.log(`   Created: ${admin.created_at}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ You can now login at /login with these credentials.');
    console.log('✅ After login, you will be redirected to /super-admin dashboard.\n');

  } catch (err: any) {
    if (err.code === '23505') {
      console.error(`❌ Email ${email} already registered with a different role.`);
    } else {
      console.error('❌ Seed failed:', err.message);
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
