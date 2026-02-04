const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../db');

const DATA_DIR = path.join(__dirname, '../data/QSS - Customer Data');
const RECORD_SIZE = 2432;

// Offsets
const OFFSETS = {
  NAME: { start: 0, length: 60 },
  ADDRESS: { start: 60, length: 60 },
  DATE_IN: { start: 224, length: 10 },
  DATE_COMP: { start: 234, length: 10 },
  DATE_CLOSED: { start: 244, length: 10 },
  ISSUE: { start: 305, length: 500 },
  WORK: { start: 948, length: 500 },
  CLAIM: { start: 1517, length: 10 },
  UNIT_INFO: { start: 1615, length: 100 },
};

function parseString(buffer) {
  let str = '';
  for (const byte of buffer) {
    if (byte >= 32 && byte <= 126) str += String.fromCharCode(byte);
  }
  return str.trim();
}

function parseDate(str) {
  if (!str) return null;
  const cleanStr = str.trim().replace(/\./g, '-').replace(/\//g, '-');
  const parts = cleanStr.split('-');
  if (parts.length !== 3) return null;
  
  let m = parseInt(parts[0], 10);
  let d = parseInt(parts[1], 10);
  let y = parseInt(parts[2], 10);

  if (isNaN(m) || isNaN(d) || isNaN(y)) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  if (y < 1990 || y > 2050) return null;
  if (m === 2 && d > 29) return null;

  return `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
}

async function migrate() {
  console.log('Starting Repair Migration...');
  console.log('Clearing existing repairs...');
  await db.query('TRUNCATE repairs CASCADE');

  console.log('Loading clients...');
  const clientsRes = await db.query('SELECT id, name FROM clients');
  const clientMap = new Map();
  clientsRes.rows.forEach(r => {
    clientMap.set(r.name.toLowerCase().trim(), r.id);
  });
  console.log(`Loaded ${clientMap.size} clients.`);

  let files = [];
  if (fs.existsSync(path.join(DATA_DIR, 'so.dat'))) files.push('so.dat');
  
  const historyFiles = fs.readdirSync(DATA_DIR).filter(f => f.toUpperCase().endsWith('.HIS') && f.toUpperCase().startsWith('SERV'));
  historyFiles.sort().reverse();
  files = files.concat(historyFiles);

  console.log('Files to process:', files);

  const claimsProcessed = new Set();
  const repairsToInsert = [];

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    console.log(`Processing ${file}...`);
    
    try {
      const buffer = fs.readFileSync(filePath);
      const count = Math.floor(buffer.length / RECORD_SIZE);
      let validCount = 0;
      
      for (let i = 0; i < count; i++) {
        const offset = i * RECORD_SIZE;
        const record = buffer.slice(offset, offset + RECORD_SIZE);

        const claimRaw = parseString(record.slice(OFFSETS.CLAIM.start, OFFSETS.CLAIM.start + OFFSETS.CLAIM.length));
        let claimNumber = parseInt(claimRaw.replace(/\D/g, ''));

        if (!claimNumber || claimNumber > 2000000 || claimNumber < 1000) continue;
        if (claimsProcessed.has(claimNumber)) continue;
        
        const name = parseString(record.slice(OFFSETS.NAME.start, OFFSETS.NAME.start + OFFSETS.NAME.length));
        if (!name || name.length < 3 || /^\d+$/.test(name)) continue;

        claimsProcessed.add(claimNumber);
        validCount++;

        const dateInStr = parseString(record.slice(OFFSETS.DATE_IN.start, OFFSETS.DATE_IN.start + OFFSETS.DATE_IN.length));
        const dateCompStr = parseString(record.slice(OFFSETS.DATE_COMP.start, OFFSETS.DATE_COMP.start + OFFSETS.DATE_COMP.length));
        const dateClosedStr = parseString(record.slice(OFFSETS.DATE_CLOSED.start, OFFSETS.DATE_CLOSED.start + OFFSETS.DATE_CLOSED.length));

        const dateIn = parseDate(dateInStr);
        const dateComp = parseDate(dateCompStr);
        const dateClosed = parseDate(dateClosedStr);

        const issue = parseString(record.slice(OFFSETS.ISSUE.start, OFFSETS.ISSUE.start + OFFSETS.ISSUE.length));
        const work = parseString(record.slice(OFFSETS.WORK.start, OFFSETS.WORK.start + OFFSETS.WORK.length));

        const unitRaw = parseString(record.slice(OFFSETS.UNIT_INFO.start, OFFSETS.UNIT_INFO.start + OFFSETS.UNIT_INFO.length));
        const unitParts = unitRaw.split(/\s{2,}/);
        
        let brand = unitParts[0] || 'Unknown';
        let model = unitParts[1] || 'Unknown';
        let serial = unitParts[2] || '';
        
        let status = 'checked_in';
        if (file.endsWith('.HIS') || dateClosed || dateComp) {
            status = 'completed';
            if (dateClosed) status = 'picked_up';
        }

        let clientId = clientMap.get(name.toLowerCase().trim());

        repairsToInsert.push({
            claim_number: claimNumber,
            client_id: clientId || null,
            brand: brand.substring(0, 255),
            model: model.substring(0, 255),
            serial: serial.substring(0, 255),
            issue: issue.replace(/\0/g, ''),
            work_performed: work.replace(/\0/g, ''),
            status,
            created_at: dateIn,
            completed_date: dateComp,
            closed_date: dateClosed,
            legacy_file: file
        });
      }
      console.log(`  Found ${validCount} valid records in ${file}`);
    } catch (err) {
      console.error(`Error reading ${file}:`, err);
    }
  }

  console.log(`Prepared ${repairsToInsert.length} repairs.`);

  let inserted = 0;
  let errors = 0;

  for (const r of repairsToInsert) {
    try {
        await db.query(`
            INSERT INTO repairs (
                claim_number, client_id, brand, model, serial, issue, work_performed, 
                status, created_at, completed_date, closed_date, is_shipped_in
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false)
            ON CONFLICT (id) DO NOTHING 
        `, [
            r.claim_number, r.client_id, r.brand, r.model, r.serial, r.issue, r.work_performed,
            r.status, r.created_at || new Date(), r.completed_date, r.closed_date
        ]);
        inserted++;
    } catch (e) {
        errors++;
    }
    if (inserted % 100 === 0) process.stdout.write(`\rInserted ${inserted}`);
  }

  console.log(`\nInserted ${inserted} repairs. ${errors} errors.`);
  await db.query(`SELECT setval('claim_number_seq', (SELECT MAX(claim_number) FROM repairs))`);
  console.log('Done.');
  process.exit(0);
}

migrate();
