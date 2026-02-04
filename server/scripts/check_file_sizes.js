const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../data/QSS - Customer Data');
const files = fs.readdirSync(dir).filter(f => f.toUpperCase().endsWith('.HIS'));

files.forEach(f => {
    const stats = fs.statSync(path.join(dir, f));
    const remainder = stats.size % 2432;
    console.log(`${f}: ${stats.size} bytes (Mod 2432: ${remainder})`);
});

const soStats = fs.statSync(path.join(dir, 'so.dat'));
console.log(`so.dat: ${soStats.size} bytes (Mod 2432: ${soStats.size % 2432})`);
