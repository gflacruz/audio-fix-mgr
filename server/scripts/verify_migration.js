const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../db');

async function verify() {
  try {
    const res = await db.query('SELECT * FROM clients ORDER BY id DESC LIMIT 5');
    console.log('Last 5 imported clients:');
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

verify();
