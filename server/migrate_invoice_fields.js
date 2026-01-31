const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');

async function migrate() {
  const client = await db.pool.connect();
  try {
    console.log('Starting migration: Adding invoice fields to repairs table...');
    await client.query('BEGIN');
    await client.query('ALTER TABLE repairs ADD COLUMN IF NOT EXISTS work_performed TEXT');
    await client.query('ALTER TABLE repairs ADD COLUMN IF NOT EXISTS labor_cost NUMERIC(10, 2) DEFAULT 0.00');
    await client.query('ALTER TABLE repairs ADD COLUMN IF NOT EXISTS return_shipping_cost NUMERIC(10, 2) DEFAULT 0.00');
    await client.query('ALTER TABLE repairs ADD COLUMN IF NOT EXISTS return_shipping_carrier VARCHAR(100)');
    await client.query('COMMIT');
    console.log('Migration completed successfully.');

    // Verify columns
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'repairs'
    `);
    console.log('Current columns in repairs table:');
    res.rows.forEach(r => console.log(`- ${r.column_name} (${r.data_type})`));

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    process.exit();
  }
}

migrate();