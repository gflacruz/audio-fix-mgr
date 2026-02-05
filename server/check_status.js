const { Pool } = require('pg');
require('dotenv').config({ path: 'server/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkStatus() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT status, COUNT(*) 
      FROM repairs 
      GROUP BY status
    `);
    console.log('Repairs by status:', res.rows);
    
    // Check if we have completed dates but open status
    const mismatch = await client.query(`
      SELECT COUNT(*) 
      FROM repairs 
      WHERE status != 'closed' AND (completed_date IS NOT NULL OR closed_date IS NOT NULL)
    `);
    console.log('Open repairs with completed/closed dates:', mismatch.rows[0].count);

  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

checkStatus();
