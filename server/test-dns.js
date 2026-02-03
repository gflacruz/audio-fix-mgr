
const dns = require('dns');

console.log('Testing dns.lookup...');
dns.lookup('smtp.gmail.com', (err, address, family) => {
  if (err) console.error('dns.lookup failed:', err);
  else console.log('dns.lookup success:', address, 'family:', family);
});

console.log('Testing dns.resolve4...');
dns.resolve4('smtp.gmail.com', (err, addresses) => {
  if (err) console.error('dns.resolve4 failed:', err);
  else console.log('dns.resolve4 success:', addresses);
});

console.log('Testing dns.resolveAny...');
dns.resolveAny('smtp.gmail.com', (err, addresses) => {
    if (err) console.error('dns.resolveAny failed:', err);
    else console.log('dns.resolveAny success:', addresses);
});
