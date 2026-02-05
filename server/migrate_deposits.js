const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');
const xlsx = require('xlsx');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const excelPath = path.join(__dirname, 'data/Merged_Repairs.xlsx');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting migration...');

    // 1. Add column if not exists
    console.log('Ensuring deposit_amount column exists...');
    await client.query(`
      ALTER TABLE repairs 
      ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10, 2) DEFAULT 0.00;
    `);

    // 2. Read Excel
    console.log(`Reading Excel file from ${excelPath}...`);
    const workbook = xlsx.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    console.log(`Found ${data.length} rows in Excel.`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 3. Update records
    for (const row of data) {
      const claimNumber = row['Claim #'];
      const deposit = row['Deposit'];

      if (!claimNumber) {
        skippedCount++;
        continue;
      }

      // Parse deposit
      let depositAmount = 0;
      if (typeof deposit === 'number') {
        depositAmount = deposit;
      } else if (typeof deposit === 'string') {
        depositAmount = parseFloat(deposit.replace(/[^0-9.-]+/g, '')); // Remove currency symbols if any
      }

      if (isNaN(depositAmount)) depositAmount = 0;

      if (depositAmount > 0) {
        try {
          // Check if repair exists first (optional, but good for logging)
          // We update strictly on claim_number
          const result = await client.query(`
            UPDATE repairs 
            SET 
              deposit_amount = $1,
              diagnostic_fee_collected = TRUE
            WHERE claim_number = $2
          `, [depositAmount, claimNumber.toString()]);

          if (result.rowCount > 0) {
            updatedCount++;
            if (updatedCount % 50 === 0) process.stdout.write('.');
          } else {
            // Repair might not exist in DB yet
            skippedCount++;
          }
        } catch (err) {
          console.error(`Error updating claim ${claimNumber}:`, err.message);
          errorCount++;
        }
      } else {
        // Deposit is 0
        skippedCount++;
      }
    }

    console.log('\nMigration complete.');
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped (No deposit or not found): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
