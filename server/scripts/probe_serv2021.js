const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/QSS - Customer Data/SERV2021.HIS');

if (!fs.existsSync(filePath)) {
    console.log("File not found");
    process.exit(0);
}

const buffer = fs.readFileSync(filePath);
console.log(`File size: ${buffer.length}`);

// Scan for a known pattern or text density.
// Names usually appear at start of record.
// Let's print chunks every 2000 bytes approx to see if we see names.

const bytesToRead = Math.min(buffer.length, 10000);
const bytesPerRow = 64;

for (let i = 0; i < bytesToRead; i += bytesPerRow) {
  const chunk = buffer.slice(i, i + bytesPerRow);
  let ascii = '';
  for (const byte of chunk) {
    if (byte >= 32 && byte <= 126) ascii += String.fromCharCode(byte);
    else ascii += '.';
  }
  console.log(`${i.toString().padStart(6, '0')} | ${ascii}`);
}
