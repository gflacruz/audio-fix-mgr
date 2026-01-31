const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');

async function migrate() {
  const client = await db.pool.connect();
  try {
    console.log('Starting migration: Adding shipment fields to repairs table...');
    
    await client.query('BEGIN');

    // Add is_shipped_in
    await client.query(`
      ALTER TABLE repairs 
      ADD COLUMN IF NOT EXISTS is_shipped_in BOOLEAN DEFAULT FALSE
    `);

    // Add shipping_carrier
    await client.query(`
      ALTER TABLE repairs 
      ADD COLUMN IF NOT EXISTS shipping_carrier VARCHAR(100)
    `);

    // Add box_height (using NUMERIC for precise dimensions, e.g. 12.5)
    await client.query(`
      ALTER TABLE repairs 
      ADD COLUMN IF NOT EXISTS box_height NUMERIC(10, 2)
    `);

    // Add box_length
    await client.query(`
      ALTER TABLE repairs 
      ADD COLUMN IF NOT EXISTS box_length NUMERIC(10, 2)
    `);

    // Add box_width
    await client.query(`
      ALTER TABLE repairs 
      ADD COLUMN IF NOT EXISTS box_width NUMERIC(10, 2)
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
