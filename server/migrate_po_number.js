const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting migration...');
    await client.query('BEGIN');

    await client.query('ALTER TABLE repairs ADD COLUMN IF NOT EXISTS po_number VARCHAR(100)');
    await client.query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS tax_exempt BOOLEAN DEFAULT FALSE');

    await client.query('COMMIT');
    console.log('Migration successful');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
