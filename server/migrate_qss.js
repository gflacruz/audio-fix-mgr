const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

// If DATABASE_URL is missing, fallback manually (useful if .env fails)
if (!process.env.DATABASE_URL) {
  client.user = 'admin';
  client.password = 'securepassword';
  client.host = 'localhost';
  client.database = 'audio_fix';
  client.port = 5432;
}

const DATA_DIR = path.join(__dirname, 'data', 'QSS - Customer Data');
const SU_FILE = path.join(DATA_DIR, 'SU.DAT');
const SO_FILE = path.join(DATA_DIR, 'SO.DAT');

const SU_RECORD_SIZE = 242;
const SO_RECORD_SIZE = 2477;

// Utility to clean strings
function clean(str) {
  if (!str) return '';
  // Remove binary garbage, nulls, and trim
  return str.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
}

// Utility to parse date
function parseDate(str) {
  const cleaned = clean(str);
  if (!cleaned) return null;
  // Try MM-DD-YYYY or M/D/YYYY
  const match = cleaned.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (match) {
    return `${match[3]}-${match[1]}-${match[2]}`; // YYYY-MM-DD
  }
  return null;
}

// Extract City, State, Zip from "City, ST 12345"
function parseCityStateZip(str) {
  const cleaned = clean(str);
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

async function migrateCustomers() {
  console.log('--- Migrating Customers (SU.DAT) ---');
  if (!fs.existsSync(SU_FILE)) {
    console.error('SU.DAT not found');
    return;
  }

  const fd = fs.openSync(SU_FILE, 'r');
  const buffer = Buffer.alloc(SU_RECORD_SIZE);
  let count = 0;
  let inserted = 0;

  const fileSize = fs.statSync(SU_FILE).size;
  const totalRecords = fileSize / SU_RECORD_SIZE;

  for (let i = 0; i < totalRecords; i++) {
    fs.readSync(fd, buffer, 0, SU_RECORD_SIZE, 0); // Position is auto-updated if null? No, need to track or use sync reading
    // Actually readSync with position null updates the file position? No, it doesn't for fs.readSync with a file descriptor if pos is specified.
    // Better to use readSync with position calculated or just a stream.
    // For simplicity with fixed width, we can just calculate position.
    
    // Correction: fs.readSync(fd, buffer, offset, length, position)
    // If position is null, data will be read from the current file position, and the file position will be updated.
    
    // But let's be explicit to be safe.
    const position = i * SU_RECORD_SIZE;
    fs.readSync(fd, buffer, 0, SU_RECORD_SIZE, position);

    const record = buffer.toString('binary');

    const company = clean(record.substring(0, 30));
    const contact = clean(record.substring(30, 60));
    const address = clean(record.substring(60, 90));
    const cityStateZipRaw = clean(record.substring(90, 120));
    const phone = clean(record.substring(120, 135));
    // Email seems to be around 151. Let's look for @
    const emailArea = clean(record.substring(135, 200));
    // Simple email extraction
    const emailMatch = emailArea.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : '';
    
    // Determine name to use (Contact or Company)
    const name = contact || company || 'Unknown Customer';
    const { city, state, zip } = parseCityStateZip(cityStateZipRaw);

    // Skip empty records
    if (!name && !company) continue;

    try {
      // Check if exists
      const res = await client.query('SELECT id FROM clients WHERE name = $1', [name]);
      if (res.rows.length === 0) {
        const insertRes = await client.query(
          `INSERT INTO clients (name, company_name, address, city, state, zip, phone, email)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [name, company, address, city, state, zip, phone, email]
        );
        inserted++;
      }
    } catch (err) {
      console.error(`Error inserting ${name}:`, err.message);
    }
    count++;
  }
  fs.closeSync(fd);
  console.log(`Processed ${count} customers, inserted ${inserted}.`);
}

async function migrateRepairs() {
  console.log('--- Migrating Repairs (SO.DAT) ---');
  if (!fs.existsSync(SO_FILE)) {
    console.error('SO.DAT not found');
    return;
  }

  const fd = fs.openSync(SO_FILE, 'r');
  const buffer = Buffer.alloc(SO_RECORD_SIZE);
  let count = 0;
  let inserted = 0;

  const fileSize = fs.statSync(SO_FILE).size;
  const totalRecords = fileSize / SO_RECORD_SIZE;

  for (let i = 0; i < totalRecords; i++) {
    const position = i * SO_RECORD_SIZE;
    fs.readSync(fd, buffer, 0, SO_RECORD_SIZE, position);
    const record = buffer.toString('binary');

    // Mappings based on analysis
    const customerName = clean(record.substring(0, 30));
    // Address info in SO.DAT seems redundant, skipping unless we need to create a client
    const dateInRaw = clean(record.substring(224, 234));
    const issue = clean(record.substring(302, 1000)); // Grab a large chunk and trim
    const claimNumberStr = clean(record.substring(1517, 1525));
    const brand = clean(record.substring(1621, 1636));
    const model = clean(record.substring(1636, 1651));
    const serial = clean(record.substring(1651, 1666));
    // Phone in SO.DAT?
    const phoneRaw = clean(record.substring(1666, 1681));

    if (!claimNumberStr) continue;
    const claimNumber = parseInt(claimNumberStr, 10);
    if (isNaN(claimNumber)) continue;

    const dateIn = parseDate(dateInRaw);

    // Find or Create Client
    let clientId = null;
    const clientRes = await client.query('SELECT id FROM clients WHERE name = $1', [customerName]);
    
    if (clientRes.rows.length > 0) {
      clientId = clientRes.rows[0].id;
    } else {
      // Create stub client
      // Try to parse address from SO.DAT if needed
      const address = clean(record.substring(60, 90));
      const cityStateZipRaw = clean(record.substring(90, 120));
      const { city, state, zip } = parseCityStateZip(cityStateZipRaw);
      
      try {
        const newClient = await client.query(
          `INSERT INTO clients (name, address, city, state, zip, phone)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [customerName, address, city, state, zip, phoneRaw]
        );
        clientId = newClient.rows[0].id;
      } catch (e) {
        console.error(`Failed to create client ${customerName}:`, e.message);
        continue;
      }
    }

    try {
      // Check if repair exists
      const repairRes = await client.query('SELECT id FROM repairs WHERE claim_number = $1', [claimNumber]);
      if (repairRes.rows.length === 0) {
        await client.query(
          `INSERT INTO repairs (
            claim_number, client_id, brand, model, serial, issue, 
            status, created_at, priority
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            claimNumber, 
            clientId, 
            brand || 'Unknown', 
            model || 'Unknown', 
            serial, 
            issue || 'Legacy Repair', 
            'completed', 
            dateIn || new Date(),
            'normal'
          ]
        );
        inserted++;
      }
    } catch (err) {
      console.error(`Error inserting repair ${claimNumber}:`, err.message);
    }
    count++;
  }
  fs.closeSync(fd);
  console.log(`Processed ${count} repairs, inserted ${inserted}.`);
}

async function main() {
  try {
    await client.connect();
    await migrateCustomers();
    await migrateRepairs();
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

main();
