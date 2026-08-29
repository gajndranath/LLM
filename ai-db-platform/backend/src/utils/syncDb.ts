import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';

/**
 * Utility script to push the initial schema to the database.
 * Run this once after setting up your Neon/Postgres URL.
 */
export const syncSchema = async () => {
  console.log('🔄 Starting database schema sync...');
  
  try {
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    const schemaSql = await fs.promises.readFile(schemaPath, 'utf8');
    
    // Split by semicolon but ignore ones inside functions
    // For simplicity, we run the whole block
    await pool.query(schemaSql);
    
    console.log('✅ Database schema synced successfully!');
  } catch (error) {
    console.error('❌ Failed to sync schema:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

// If run directly
if (require.main === module) {
  syncSchema().then(() => process.exit(0));
}
