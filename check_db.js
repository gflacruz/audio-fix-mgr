require('dotenv').config({ path: './server/.env' });
const db = require('./server/db');

async function checkColumns() {
  try {
    const res = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'repairs';
    `);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  }
}

checkColumns();
