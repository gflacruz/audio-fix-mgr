const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });
const db = require('./server/db');

async function checkColumns() {
  try {
    const res = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'repairs'
    `);
    console.log('Columns in repairs table:');
    res.rows.forEach(r => console.log(`- ${r.column_name} (${r.data_type})`));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkColumns();
