const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

// Fallback config if .env is missing or invalid
if (!process.env.DATABASE_URL) {
  client.user = 'admin';
  client.password = 'securepassword';
  client.host = 'localhost';
  client.database = 'audio_fix';
  client.port = 5432;
}

const FILE_PATH = path.join(__dirname, 'data', 'Merged_Repairs.xlsx');

function clean(str) {
  if (!str) return '';
  // Convert to string if it's not
  const s = String(str);
  // Remove binary garbage, nulls, and trim
  return s.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
}

function parseDate(str) {
  const cleaned = clean(str);
  if (!cleaned) return null;
  
  // Excel sometimes returns dates as serial numbers (e.g. 44382)
  // Check if it's a number
  if (!isNaN(cleaned) && !cleaned.includes('-') && !cleaned.includes('/')) {
      const date = XLSX.SSF.parse_date_code(parseInt(cleaned));
      if (date) {
          // pad with leading zeros
          const m = String(date.m).padStart(2, '0');
          const d = String(date.d).padStart(2, '0');
          return `${date.y}-${m}-${d}`;
      }
  }

  // Try MM-DD-YYYY or M/D/YYYY
  const match = cleaned.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (match) {
    const y = parseInt(match[3]);
    const m = parseInt(match[1]);
    const d = parseInt(match[2]);
    
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;

    return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`; // YYYY-MM-DD
  }
  return null;
}

function parseCityStateZip(str) {
  const cleaned = clean(str);
  if (!cleaned) return { city: '', state: '', zip: '' };

  // Regex for "City, ST Zip" or "City ST Zip"
  // Look for Zip at end
  const zipMatch = cleaned.match(/\b\d{5}(-\d{4})?$/);
  let zip = '';
  let remainder = cleaned;
  
  if (zipMatch) {
    zip = zipMatch[0];
    remainder = cleaned.substring(0, zipMatch.index).trim();
  }

  // Look for State (2 chars) at end of remainder
  // "Tampa, FL" -> "Tampa," "FL"
  const stateMatch = remainder.match(/[ ,]+([A-Za-z]{2})$/);
  let state = '';
  let city = remainder;

  if (stateMatch) {
    state = stateMatch[1].toUpperCase();
    city = remainder.substring(0, stateMatch.index).trim();
  }

  // Clean trailing commas from city
  city = city.replace(/,+$/, '');

  return { city, state, zip };
}

async function main() {
  try {
    console.log('Connecting to database...');
    await client.connect();

    console.log(`Reading Excel file: ${FILE_PATH}`);
    const workbook = XLSX.readFile(FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // header: 1 returns array of arrays [ ['Name', 'Age'], ['John', 30] ]
    // but using sheet_to_json without header: 1 gives objects keyed by header which is easier
    // however, we need to know the exact keys.
    // Based on inspection:
    // 'Name', 'Company Name', 'Address', 'City State', 'Phone', 'Received By',
    // 'Claim #', 'Make', 'Model', 'Serial #', 'Date In', 'Date Approved',
    // 'Date Completed', 'Problem', 'Repairs', 'Tech', 'Deposit', 'Labor', 'Parts', 'Total'
    
    const data = XLSX.utils.sheet_to_json(worksheet); 
    console.log(`Found ${data.length} records.`);

    let insertedClients = 0;
    let insertedRepairs = 0;
    let skippedRepairs = 0;

    for (const row of data) {
      // 1. Extract Client Data
      const name = clean(row['Name']) || clean(row['Company Name']) || 'Unknown Customer';
      const companyName = clean(row['Company Name']);
      // If Name was empty and we used CompanyName, should we clear CompanyName? 
      // It's fine to keep it.
      
      const address = clean(row['Address']);
      const cityStateRaw = clean(row['City State']);
      const { city, state, zip } = parseCityStateZip(cityStateRaw);
      const phone = clean(row['Phone']);
      
      // 2. Extract Repair Data
      const claimNumberRaw = row['Claim #'];
      const claimNumber = parseInt(clean(claimNumberRaw), 10);
      
      if (!claimNumber || isNaN(claimNumber)) {
        // console.log('Skipping row with no claim number:', row);
        continue;
      }

      const brand = clean(row['Make']) || 'Unknown';
      const model = clean(row['Model']) || 'Unknown';
      const serial = clean(row['Serial #']);
      const dateIn = parseDate(row['Date In']) || new Date().toISOString().split('T')[0];
      const dateCompleted = parseDate(row['Date Completed']);
      const issue = clean(row['Problem']) || 'Legacy Repair';
      const workPerformed = clean(row['Repairs']);
      const technician = clean(row['Tech']);
      const laborCost = parseFloat(row['Labor']) || 0.00;
      
      // 3. Find or Create Client
      let clientId = null;
      try {
        const clientRes = await client.query('SELECT id FROM clients WHERE name = $1', [name]);
        if (clientRes.rows.length > 0) {
          clientId = clientRes.rows[0].id;
        } else {
          // Insert new client
          const insertRes = await client.query(
            `INSERT INTO clients (name, company_name, address, city, state, zip, phone)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [name, companyName, address, city, state, zip, phone]
          );
          clientId = insertRes.rows[0].id;
          insertedClients++;
        }
      } catch (err) {
        console.error(`Error processing client ${name}:`, err.message);
        continue; // Skip repair if client fails
      }

      // 4. Find or Create Repair
      try {
        const repairRes = await client.query('SELECT id FROM repairs WHERE claim_number = $1', [claimNumber]);
        if (repairRes.rows.length > 0) {
            skippedRepairs++;
            // Optional: Update existing repair? For now, we assume skip if exists.
        } else {
          const status = dateCompleted ? 'completed' : 'checked_in';
          
          await client.query(
            `INSERT INTO repairs (
              claim_number, client_id, brand, model, serial, issue, 
              work_performed, technician, labor_cost, 
              status, created_at, completed_date, closed_date, priority
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
              claimNumber,
              clientId,
              brand,
              model,
              serial,
              issue,
              workPerformed,
              technician,
              laborCost,
              status,
              dateIn,
              dateCompleted,      // completed_date
              dateCompleted,      // closed_date (assume closed if completed for legacy)
              'normal'
            ]
          );
          insertedRepairs++;
        }
      } catch (err) {
        console.error(`Error processing repair ${claimNumber}:`, err.message);
      }
    }

    console.log('--- Migration Summary ---');
    console.log(`Total Records Processed: ${data.length}`);
    console.log(`New Clients Inserted: ${insertedClients}`);
    console.log(`New Repairs Inserted: ${insertedRepairs}`);
    console.log(`Repairs Skipped (Duplicate): ${skippedRepairs}`);

  } catch (err) {
    console.error('Fatal Error:', err);
  } finally {
    await client.end();
  }
}

main();
