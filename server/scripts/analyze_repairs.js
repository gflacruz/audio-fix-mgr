const fs = require('fs');
const path = require('path');

const files = ['so.dat', 'SERV2023.HIS'];

files.forEach(file => {
  const filePath = path.join(__dirname, '../data/QSS - Customer Data/', file);
  console.log(`\nAnalyzing ${file}...`);
  
  try {
    if (!fs.existsSync(filePath)) {
        console.log("File not found.");
        return;
    }
    const buffer = fs.readFileSync(filePath);
    console.log(`File size: ${buffer.length} bytes`);

    const bytesToRead = Math.min(buffer.length, 4096);
    const bytesPerRow = 64; // Wider view
    
    for (let i = 0; i < bytesToRead; i += bytesPerRow) {
      const chunk = buffer.slice(i, i + bytesPerRow);
      let ascii = '';
      for (const byte of chunk) {
        if (byte >= 32 && byte <= 126) {
          ascii += String.fromCharCode(byte);
        } else {
          ascii += '.';
        }
      }
      console.log(`${i.toString().padStart(6, '0')} | ${ascii}`);
    }
  } catch (err) {
    console.error(err);
  }
});
