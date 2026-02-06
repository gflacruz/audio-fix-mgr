const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add new columns if they don't exist
    const columns = [
      'ALTER TABLE parts ADD COLUMN IF NOT EXISTS nomenclature VARCHAR(255)',
      'ALTER TABLE parts ADD COLUMN IF NOT EXISTS low_limit INTEGER DEFAULT 0',
      'ALTER TABLE parts ADD COLUMN IF NOT EXISTS on_order INTEGER DEFAULT 0',
      'ALTER TABLE parts ADD COLUMN IF NOT EXISTS best_price_quality VARCHAR(100)',
      'ALTER TABLE parts ADD COLUMN IF NOT EXISTS unit_of_issue VARCHAR(50)',
      'ALTER TABLE parts ADD COLUMN IF NOT EXISTS last_supplier VARCHAR(255)',
      'ALTER TABLE parts ADD COLUMN IF NOT EXISTS supply_source VARCHAR(255)',
      'ALTER TABLE parts ADD COLUMN IF NOT EXISTS remarks TEXT'
    ];

    for (const query of columns) {
      await client.query(query);
      console.log(`Executed: ${query}`);
    }

    await client.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
