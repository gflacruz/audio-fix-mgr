const db = require('./db');

async function checkUsers() {
  try {
    const result = await db.query('SELECT * FROM users');
    console.log('Users in DB:', result.rows);
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    process.exit();
  }
}

checkUsers();
