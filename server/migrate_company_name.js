const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');

async function migrate() {
  const client = await db.pool.connect();
  try {
    console.log('Starting migration: Adding company_name to clients table...');
    
    await client.query('BEGIN');

    // Add company_name
    await client.query(`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS company_name VARCHAR(255)
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
