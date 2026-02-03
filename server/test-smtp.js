
require('dotenv').config();
const nodemailer = require('nodemailer');
const dns = require('dns');
const util = require('util');

const lookup = util.promisify(dns.lookup);

async function verify() {
  try {
    console.log('Resolving host using dns.lookup...');
    const { address } = await lookup(process.env.SMTP_HOST);
    console.log('Resolved to:', address);

    const transporter = nodemailer.createTransport({
      host: address, // Use resolved IP
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        servername: process.env.SMTP_HOST // Required for SSL verification
      },
      logger: true,
      debug: true
    });

    console.log('Verifying connection...');
    await transporter.verify();
    console.log('Server is ready to take our messages');
  } catch (error) {
    console.error('Verification failed:', error);
  }
}

verify();
