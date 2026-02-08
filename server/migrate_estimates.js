const db = require('./db');

async function migrate() {
  const client = await db.pool.connect();
  try {
    console.log('Starting migration: creating estimates table...');
    await client.query('BEGIN');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS estimates (
        id SERIAL PRIMARY KEY,
        repair_id INTEGER REFERENCES repairs(id) ON DELETE CASCADE,
        diagnostic_notes TEXT,
        work_performed TEXT,
        labor_cost DECIMAL(10, 2) DEFAULT 0.00,
        parts_cost DECIMAL(10, 2) DEFAULT 0.00,
        total_cost DECIMAL(10, 2) DEFAULT 0.00,
        status VARCHAR(50) DEFAULT 'pending',
        created_technician VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notified_date TIMESTAMP,
        approved_date TIMESTAMP
      )
    `);

    // Add trigger to update updated_at automatically
    await client.query(`
      CREATE OR REPLACE FUNCTION update_estimates_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Drop trigger if exists to avoid error on rerun
    await client.query(`DROP TRIGGER IF EXISTS update_estimates_updated_at ON estimates`);

    await client.query(`
      CREATE TRIGGER update_estimates_updated_at
      BEFORE UPDATE ON estimates
      FOR EACH ROW
      EXECUTE PROCEDURE update_estimates_updated_at_column();
    `);

    await client.query('COMMIT');
    console.log('Migration successful: estimates table created with all fields');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    // db.pool.end(); // Keep pool open if needed, but for script we can just let process exit or close it.
    // However, db module exports pool.
    await db.pool.end();
  }
}

migrate();
