const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/QSS - Customer Data/su.dat');
const outputPath = path.join(__dirname, 'analysis_output.txt');

try {
  let output = '';
  const log = (str) => { output += str + '\n'; };

  if (!fs.existsSync(filePath)) {
    log(`File not found: ${filePath}`);
    fs.writeFileSync(outputPath, output);
    process.exit(1);
  }

  const buffer = fs.readFileSync(filePath);
  log(`File size: ${buffer.length} bytes`);

  // Analyze the first 4096 bytes (increased to see more patterns)
  const bytesToRead = Math.min(buffer.length, 4096);
  log(`\nAnalyzing first ${bytesToRead} bytes...\n`);

  const bytesPerRow = 32; 
  
  for (let i = 0; i < bytesToRead; i += bytesPerRow) {
    const chunk = buffer.slice(i, i + bytesPerRow);
    
    // Hex representation
    const hex = chunk.toString('hex').match(/.{1,2}/g).join(' ');
    
    // ASCII representation (replace non-printable with '.')
    let ascii = '';
    for (const byte of chunk) {
      if (byte >= 32 && byte <= 126) {
        ascii += String.fromCharCode(byte);
      } else {
        ascii += '.';
      }
    }

    // Padding for alignment
    const hexPadding = '   '.repeat(bytesPerRow - chunk.length);
    
    log(`${i.toString().padStart(6, '0')} | ${hex}${hexPadding} | ${ascii}`);
  }

  fs.writeFileSync(outputPath, output);
  console.log('Analysis written to ' + outputPath);

} catch (err) {
  fs.writeFileSync(outputPath, 'Error: ' + err.message);
}
