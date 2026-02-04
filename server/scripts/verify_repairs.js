const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../db');

async function verify() {
  try {
    const res = await db.query(`
      SELECT r.id, r.claim_number, r.brand, r.model, r.status, c.name as client_name, r.created_at
      FROM repairs r
      LEFT JOIN clients c ON r.client_id = c.id
      ORDER BY r.claim_number DESC
      LIMIT 10
    `);
    console.log('Last 10 imported repairs:');
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

verify();
