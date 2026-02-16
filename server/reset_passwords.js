const db = require('./db');
const bcrypt = require('bcryptjs');

async function resetPasswords() {
  try {
    const password = 'audiofix123';
    const hash = await bcrypt.hash(password, 10);
    console.log('New Hash:', hash);

    await db.query('UPDATE users SET password = $1 WHERE username IN ($2, $3, $4)', [hash, 'willy', 'sergey', 'tyler']);
    console.log('Passwords updated successfully.');
  } catch (error) {
    console.error('Error updating passwords:', error);
  } finally {
    process.exit();
  }
}

resetPasswords();
