const db = require('./db');

async function migrate() {
  try {
    console.log('Starting migration for paid_to column...');
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      
      console.log('Adding paid_to column...');
      await client.query(`
        ALTER TABLE repairs 
        ADD COLUMN IF NOT EXISTS paid_to VARCHAR(50)
      `);

      await client.query('COMMIT');
      console.log('Migration successful.');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

migrate();
