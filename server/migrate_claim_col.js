const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting migration: converting repairs.claim_number to VARCHAR...');
    await client.query('BEGIN');
    
    // Check if column is already string to avoid errors (or just force alter)
    // We cast to varchar. Existing integers will be converted to their string representation.
    await client.query('ALTER TABLE repairs ALTER COLUMN claim_number TYPE VARCHAR(50) USING claim_number::VARCHAR');
    
    // Also drop the default if it was using the sequence, as the app now handles generation
    // finding the default constraint name is hard, but we can just drop the default
    await client.query('ALTER TABLE repairs ALTER COLUMN claim_number DROP DEFAULT');

    await client.query('COMMIT');
    console.log('Migration successful: claim_number is now VARCHAR(50)');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
