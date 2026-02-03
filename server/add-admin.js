require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Use DATABASE_URL from .env or fallback to individual parameters
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: connectionString,
  // Fallback settings if DATABASE_URL is not set
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'audio_fix_manager',
  password: process.env.DB_PASSWORD || 'your_password',
  port: process.env.DB_PORT || 5432,
});

async function addAdminUser() {
  try {
    console.log('Adding admin user "willy"...');
    
    // Hash the password
    const password = 'audiofix123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('Password hashed successfully');
    
    // Insert the admin user
    const insertQuery = `
      INSERT INTO users (username, password, name, role) 
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (username) DO NOTHING
      RETURNING id, username, name, role;
    `;
    
    const values = ['willy', hashedPassword, 'Willy', 'admin'];
    const result = await pool.query(insertQuery, values);
    
    if (result.rows.length > 0) {
      console.log('Admin user created successfully:');
      console.log(`- ID: ${result.rows[0].id}`);
      console.log(`- Username: ${result.rows[0].username}`);
      console.log(`- Name: ${result.rows[0].name}`);
      console.log(`- Role: ${result.rows[0].role}`);
      console.log(`- Password: ${password}`);
    } else {
      console.log('Admin user "willy" already exists');
    }
    
  } catch (error) {
    console.error('Error adding admin user:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
addAdminUser();