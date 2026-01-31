require('dotenv').config();
const db = require('./db');

async function getRepair() {
  try {
    const res = await db.query('SELECT id, work_performed FROM repairs LIMIT 1');
    if (res.rows.length > 0) {
      console.log('ID:', res.rows[0].id);
      console.log('Current Work:', res.rows[0].work_performed);
    } else {
      console.log('No repairs found');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

getRepair();