const db = require('./db');
const fs = require('fs');
const path = require('path');

const initInventory = async () => {
  try {
    const sqlPath = path.join(__dirname, 'inventory.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Running inventory migration...');
    await db.query(sql);
    console.log('Inventory tables created successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error creating inventory tables:', error);
    process.exit(1);
  }
};

initInventory();
