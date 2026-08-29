import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';

export const runMigration = async () => {
  try {
    const migrationPath = path.join(__dirname, '../db/migrations/005_dynamic_billing.sql');
    const sql = await fs.promises.readFile(migrationPath, 'utf8');
    await pool.query(sql);
    console.log('✅ Migration applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit(0);
  }
};

runMigration();
