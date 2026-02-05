const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

if (!process.env.DATABASE_URL) {
  client.user = 'admin';
  client.password = 'securepassword';
  client.host = 'localhost';
  client.database = 'audio_fix';
  client.port = 5432;
}

async function verify() {
  try {
    await client.connect();
    console.log('Verifying "Legacy Parts Cost" entries...');
    
    const res = await client.query(`
      SELECT r.claim_number, rp.name, rp.unit_price, rp.quantity, r.status
      FROM repair_parts rp
      JOIN repairs r ON rp.repair_id = r.id
      WHERE rp.name = 'Legacy Parts Cost'
      ORDER BY r.claim_number DESC
      LIMIT 10
    `);
    
    console.table(res.rows);
    
    const countRes = await client.query(`SELECT COUNT(*) FROM repair_parts WHERE name = 'Legacy Parts Cost'`);
    console.log(`Total Legacy Parts records found: ${countRes.rows[0].count}`);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

verify();
