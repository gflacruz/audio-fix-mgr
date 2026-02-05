const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

// Fallback config if .env is missing or invalid (matching import_excel_repairs.js behavior)
if (!process.env.DATABASE_URL) {
  client.user = 'admin';
  client.password = 'securepassword';
  client.host = 'localhost';
  client.database = 'audio_fix';
  client.port = 5432;
}

const FILE_PATH = path.join(__dirname, '../data/Merged_Repairs.xlsx');

function clean(str) {
  if (!str) return '';
  return String(str).replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
}

async function main() {
  try {
    console.log('Connecting to database...');
    await client.connect();

    console.log(`Reading Excel file: ${FILE_PATH}`);
    try {
      const workbook = XLSX.readFile(FILE_PATH);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      console.log(`Found ${data.length} rows in Excel.`);

      let updatedCount = 0;
      let skippedCount = 0;
      let noMatchCount = 0;

      for (const row of data) {
        // 1. Match logic from original importer
        const claimNumberRaw = row['Claim #'];
        const claimNumber = parseInt(clean(claimNumberRaw), 10);
        
        // Skip invalid claim numbers (just like the importer did)
        if (!claimNumber || isNaN(claimNumber)) continue;

        // 2. Get Parts Cost
        const partsCost = parseFloat(row['Parts']);
        if (!partsCost || isNaN(partsCost) || partsCost <= 0) {
          continue; // No parts cost to migrate
        }

        // 3. Find Repair in DB
        // We assume the claim number stored in DB matches the integer parsed from Excel
        // Note: The DB column claim_number is VARCHAR. 
        // The import script inserted it directly as the integer value (e.g. "111001").
        const repairRes = await client.query(
          'SELECT id, claim_number FROM repairs WHERE claim_number = $1 OR claim_number = $2', 
          [String(claimNumber), claimNumber]
        );

        if (repairRes.rows.length === 0) {
          noMatchCount++;
          continue;
        }

        const repairId = repairRes.rows[0].id;

        // 4. Safety Check: Does this repair already have parts?
        const partsCheck = await client.query(
          'SELECT COUNT(*) FROM repair_parts WHERE repair_id = $1',
          [repairId]
        );

        if (parseInt(partsCheck.rows[0].count) > 0) {
          // Parts already exist, assume manual entry or already fixed.
          skippedCount++;
          continue;
        }

        // 5. Insert Legacy Part
        await client.query(
          `INSERT INTO repair_parts (repair_id, part_id, name, quantity, unit_price)
           VALUES ($1, NULL, $2, 1, $3)`,
          [repairId, 'Legacy Parts Cost', partsCost]
        );
        
        updatedCount++;
        if (updatedCount % 50 === 0) process.stdout.write('.');
      }

      console.log('\n\n--- Migration Complete ---');
      console.log(`Repairs Updated: ${updatedCount}`);
      console.log(`Skipped (Already has parts): ${skippedCount}`);
      console.log(`Repairs Not Found in DB: ${noMatchCount}`);
      
    } catch (readError) {
      console.error(`Error reading Excel file: ${readError.message}`);
      if (readError.code === 'ENOENT') {
         console.error(`Please ensure the file exists at: ${FILE_PATH}`);
      }
    }

  } catch (err) {
    console.error('Fatal Error:', err);
  } finally {
    await client.end();
  }
}

main();
