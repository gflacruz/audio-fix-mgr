const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/QSS - Customer Data/so.dat');
const RECORD_SIZE = 2432;

const buffer = fs.readFileSync(filePath);
const record = buffer.slice(0, RECORD_SIZE);

function show(label, start, length) {
  const slice = record.slice(start, start + length);
  let str = '';
  for (const byte of slice) {
    if (byte >= 32 && byte <= 126) str += String.fromCharCode(byte);
    else str += '.';
  }
  console.log(`${label} [${start}-${start+length}]: "${str}"`);
}

console.log('--- Probing Record 1 ---');
show('Name', 0, 60);
show('Address', 60, 60);
show('CityStateZip', 120, 60); // Guessing based on su.dat layout spacing
show('Date Area Detailed', 220, 40);
show('Issue Area', 280, 200);
show('Claim Number Area', 1500, 50);
show('Unit Info Area', 1600, 100);
show('Phone Area', 1660, 40);
show('Work Performed Area', 3300, 200); // Based on previous dump seeing it at end? No, previous dump showed it at 3380? Wait, record is 2432. 
// Ah, in the previous dump, the offset 3380 was for the SECOND record (which started at 2432).
// 3380 - 2432 = 948. 
// So Work Performed is likely around offset 948 in the record.

show('Work Performed (Relative)', 948, 400); 
