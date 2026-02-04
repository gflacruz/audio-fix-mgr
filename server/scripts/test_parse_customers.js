const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/QSS - Customer Data/su.dat');
const outputPath = path.join(__dirname, 'parsed_customers.json');

const RECORD_SIZE = 242;

function parseString(buffer) {
  let str = '';
  for (const byte of buffer) {
    if (byte === 0) break; // Stop at null
    str += String.fromCharCode(byte);
  }
  return str.trim();
}

function reversePhone(phoneStr) {
  // Extract only digits
  const digits = phoneStr.replace(/\D/g, '');
  if (digits.length < 10) return phoneStr; // Return original if not standard
  return digits.split('').reverse().join('');
}

try {
  const buffer = fs.readFileSync(filePath);
  console.log(`File size: ${buffer.length} bytes`);
  
  const customers = [];
  const count = Math.floor(buffer.length / RECORD_SIZE);
  console.log(`Estimated records: ${count}`);

  for (let i = 0; i < count; i++) {
    const offset = i * RECORD_SIZE;
    const record = buffer.slice(offset, offset + RECORD_SIZE);

    // Schema Offsets
    // 0-29: Name
    // 30-59: Company
    // 60-89: Address
    // 90-119: CityStateZip
    // 120-149: Phone
    // 150-179: Email

    const rawName = parseString(record.slice(0, 30));
    
    // Skip empty records
    if (!rawName) continue;

    const rawCompany = parseString(record.slice(30, 60));
    const rawAddress = parseString(record.slice(60, 90));
    const rawCityStateZip = parseString(record.slice(90, 120));
    const rawPhone = parseString(record.slice(120, 150));
    const rawEmail = parseString(record.slice(150, 180));

    // Parse City, State, Zip
    // Format: "Tampa, FL 33604"
    let city = '', state = '', zip = '';
    const zipMatch = rawCityStateZip.match(/\d{5}(-\d{4})?/);
    if (zipMatch) {
      zip = zipMatch[0];
      const parts = rawCityStateZip.replace(zip, '').split(',');
      if (parts.length > 1) {
        city = parts[0].trim();
        state = parts[1].trim();
      } else {
        city = parts[0].trim(); // Fallback
      }
    } else {
      city = rawCityStateZip;
    }

    // Process Phone
    // It contains the number + space + "11" or "32" (Type?)
    // We'll extract the first sequence of digits
    const phoneParts = rawPhone.split(/\s+/);
    let phone = phoneParts[0] || '';
    let phoneType = phoneParts[1] || ''; // Maybe store this?

    // Reverse phone if it looks like the reversed format
    if (phone.length === 10 && !phone.startsWith('(')) {
        phone = reversePhone(phone);
    }
    
    // Format Phone nicely: (XXX) XXX-XXXX
    if (phone.length === 10) {
        phone = `(${phone.substring(0,3)}) ${phone.substring(3,6)}-${phone.substring(6)}`;
    }

    customers.push({
      id: i + 1, // Temp ID
      name: rawName,
      company_name: rawCompany,
      address: rawAddress,
      city,
      state,
      zip,
      phone,
      phone_raw: rawPhone, 
      email: rawEmail
    });
  }

  console.log(`Parsed ${customers.length} valid customers.`);
  
  // Write first 10 to file for verification
  fs.writeFileSync(outputPath, JSON.stringify(customers.slice(0, 20), null, 2));
  console.log(`Sample written to ${outputPath}`);

} catch (err) {
  console.error('Error:', err);
}
