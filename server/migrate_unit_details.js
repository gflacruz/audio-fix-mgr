const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');

async function migrate() {
  const client = await db.pool.connect();
  try {
    console.log('Starting migration: Adding model_version and accessories_included fields...');
    
    await client.query('BEGIN');

    // Add model_version
    await client.query(`
      ALTER TABLE repairs 
      ADD COLUMN IF NOT EXISTS model_version VARCHAR(100)
    `);

    // Add accessories_included
    await client.query(`
      ALTER TABLE repairs 
      ADD COLUMN IF NOT EXISTS accessories_included TEXT
    `);

    await client.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
