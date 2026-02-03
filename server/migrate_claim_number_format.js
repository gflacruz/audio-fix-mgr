const db = require('./db');

const migrate = async () => {
  const client = await db.pool.connect();
  try {
    console.log('Starting migration: Convert claim_number to VARCHAR...');
    
    await client.query('BEGIN');

    // 1. Alter the column type to VARCHAR
    // We use USING claim_number::VARCHAR to cast existing integers to strings
    await client.query(`
      ALTER TABLE repairs 
      ALTER COLUMN claim_number TYPE VARCHAR(255) 
      USING claim_number::VARCHAR
    `);

    // 2. Drop the default value (the sequence)
    await client.query(`
      ALTER TABLE repairs 
      ALTER COLUMN claim_number DROP DEFAULT
    `);

    await client.query('COMMIT');
    console.log('Migration successful: claim_number is now VARCHAR and has no default value.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    process.exit();
  }
};

migrate();
