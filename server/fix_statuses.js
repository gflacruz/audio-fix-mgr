const { Pool } = require('pg');
require('dotenv').config({ path: 'server/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixStatuses() {
  const client = await pool.connect();
  try {
    console.log('Fixing statuses...');
    
    // 1. Convert 'completed' to 'closed'
    const res1 = await client.query(`
      UPDATE repairs 
      SET status = 'closed' 
      WHERE status = 'completed'
    `);
    console.log(`Updated ${res1.rowCount} 'completed' tickets to 'closed'.`);

    // 2. Convert 'checked_in' to 'queued' (to match UI)
    const res2 = await client.query(`
      UPDATE repairs 
      SET status = 'queued' 
      WHERE status = 'checked_in'
    `);
    console.log(`Updated ${res2.rowCount} 'checked_in' tickets to 'queued'.`);

  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

fixStatuses();
