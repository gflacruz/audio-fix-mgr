const fs = require('fs');
const path = require('path');
// Load env before db
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../db');

const filePath = path.join(__dirname, '../data/QSS - Customer Data/su.dat');
const RECORD_SIZE = 242;

function parseString(buffer) {
  let str = '';
  for (const byte of buffer) {
    if (byte === 0) break; 
    str += String.fromCharCode(byte);
  }
  return str.trim();
}

function formatPhone(phoneStr) {
  // Logic: First 7 digits are number, Last 3 are Area Code
  // Raw: 2374800813 -> (813) 237-4800
  const digits = phoneStr.replace(/\D/g, '');
  
  if (digits.length === 10) {
    const numberPart = digits.substring(0, 7);
    const areaCode = digits.substring(7, 10);
    const prefix = numberPart.substring(0, 3);
    const line = numberPart.substring(3, 7);
    return `(${areaCode}) ${prefix}-${line}`;
  } else if (digits.length === 7) {
      // Assuming local 813 if missing? Or just return raw
      return `${digits.substring(0,3)}-${digits.substring(3)}`;
  }
  
  return phoneStr;
}

async function migrate() {
  console.log('Starting migration...');
  
  if (!fs.existsSync(filePath)) {
    console.error('Data file not found!');
    process.exit(1);
  }

  const buffer = fs.readFileSync(filePath);
  const count = Math.floor(buffer.length / RECORD_SIZE);
  console.log(`Found ${count} potential records.`);

  const clientsToInsert = [];

  for (let i = 0; i < count; i++) {
    const offset = i * RECORD_SIZE;
    const record = buffer.slice(offset, offset + RECORD_SIZE);

    const rawName = parseString(record.slice(0, 30));
    if (!rawName) continue;

    const rawCompany = parseString(record.slice(30, 60));
    const rawAddress = parseString(record.slice(60, 90));
    const rawCityStateZip = parseString(record.slice(90, 120));
    const rawPhone = parseString(record.slice(120, 150)); // Raw field contains extra chars
    const rawEmail = parseString(record.slice(150, 180));

    // Parse City/State/Zip
    let city = '', state = '', zip = '';
    // Typical format: "Tampa, FL 33604" or "Lakeland FL 33811"
    // Heuristic: Last token is zip, second to last is state (if 2 chars), rest is city
    const parts = rawCityStateZip.split(/[ ,]+/);
    
    if (parts.length >= 2) {
        const potentialZip = parts[parts.length - 1];
        if (/^\d{5}(-\d{4})?$/.test(potentialZip)) {
            zip = potentialZip;
            parts.pop(); // Remove zip
            
            const potentialState = parts[parts.length - 1];
            if (potentialState.length === 2) {
                state = potentialState;
                parts.pop(); // Remove state
            }
            city = parts.join(' ');
        } else {
            // No zip found at end, dump whole thing in city
            city = rawCityStateZip;
        }
    } else {
        city = rawCityStateZip;
    }

    // Phone
    const phoneParts = rawPhone.split(/\s+/);
    let phoneDigits = phoneParts[0] || '';
    const formattedPhone = formatPhone(phoneDigits);

    clientsToInsert.push({
      name: rawName,
      company_name: rawCompany,
      phone: formattedPhone,
      email: rawEmail,
      address: rawAddress,
      city: city,
      state: state,
      zip: zip
    });
  }

  console.log(`Prepared ${clientsToInsert.length} clients for insertion.`);

  // Batch Insert
  const BATCH_SIZE = 50;
  let inserted = 0;

  try {
    // Optional: Clear existing clients? 
    // await db.query('TRUNCATE TABLE clients CASCADE'); 
    // console.log('Cleared existing clients.');

    for (let i = 0; i < clientsToInsert.length; i += BATCH_SIZE) {
      const batch = clientsToInsert.slice(i, i + BATCH_SIZE);
      
      // Construct VALUES clause
      // ($1, $2, $3, ...), ($8, $9, ...)
      const values = [];
      const params = [];
      let paramIdx = 1;

      batch.forEach(client => {
        values.push(`($${paramIdx}, $${paramIdx+1}, $${paramIdx+2}, $${paramIdx+3}, $${paramIdx+4}, $${paramIdx+5}, $${paramIdx+6}, $${paramIdx+7})`);
        params.push(
            client.name, 
            client.company_name, 
            client.phone, 
            client.email, 
            client.address, 
            client.city, 
            client.state, 
            client.zip
        );
        paramIdx += 8;
      });

      const queryText = `
        INSERT INTO clients (name, company_name, phone, email, address, city, state, zip)
        VALUES ${values.join(', ')}
      `;

      await db.query(queryText, params);
      inserted += batch.length;
      process.stdout.write(`\rInserted ${inserted} / ${clientsToInsert.length}`);
    }

    console.log('\nMigration complete!');
    process.exit(0);
  } catch (err) {
    console.error('\nDatabase error:', err);
    process.exit(1);
  }
}

migrate();
