const { Pool } = require('pg');
require('dotenv').config({ path: 'server/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkTechnicians() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT * FROM users WHERE role = 'technician'");
    console.log('Technicians:', res.rows.map(t => t.name));
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

checkTechnicians();
