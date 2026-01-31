const db = require('./db');

const migrateInventoryQuantity = async () => {
  try {
    console.log('Running inventory quantity migration...');
    await db.query(`
      ALTER TABLE parts 
      ADD COLUMN IF NOT EXISTS quantity_in_stock INTEGER NOT NULL DEFAULT 0;
    `);
    console.log('Added quantity_in_stock column to parts table.');
    process.exit(0);
  } catch (error) {
    console.error('Error updating inventory table:', error);
    process.exit(1);
  }
};

migrateInventoryQuantity();
