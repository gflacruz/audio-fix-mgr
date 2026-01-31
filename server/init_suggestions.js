const db = require('./db');

async function migrate() {
  const client = await db.pool.connect();
  try {
    console.log('Starting suggestions migration...');
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS suggestions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    console.log('Suggestions table created successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    try {
        await db.pool.end();
    } catch (e) {
        console.log('Pool closed');
    }
  }
}

migrate();
