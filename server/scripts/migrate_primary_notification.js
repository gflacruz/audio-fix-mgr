const db = require('../db');

async function migrate() {
  try {
    console.log('Adding primary_notification column to clients table...');
    // using DO block to check for existence effectively in standard SQL or just allow fail if exists?
    // Postgres specific IF NOT EXISTS is good.
    await db.query(`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS primary_notification VARCHAR(20) DEFAULT 'Phone';
    `);
    console.log('Migration successful.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
