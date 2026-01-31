const nodemailer = require('nodemailer');

// Create reusable transporter object using the default SMTP transport
// Configure these in your .env file
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'user@example.com',
    pass: process.env.SMTP_PASS || 'password',
  },
});

/**
 * Send an email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 */
const sendEmail = async (to, subject, html) => {
  if (!to) throw new Error('No recipient email provided');

  // Verify connection configuration (optional, but good for debugging)
  // await transporter.verify();

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || '"Audio Fix Manager" <noreply@audiofix.com>',
    to,
    subject,
    html,
  });

  console.log("Message sent: %s", info.messageId);
  return info;
};

const getEstimateTemplate = (clientName, deviceName) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <h2 style="color: #d97706;">Estimate Available</h2>
      <p>Hello ${clientName},</p>
      <p>We have completed the diagnostic for your <strong>${deviceName}</strong>.</p>
      <p>An estimate for the repair is now available. Please give us a call at your earliest convenience to discuss the details and authorize the repair.</p>
      <div style="background-color: #f4f4f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Shop Phone:</strong> (555) 123-4567</p>
        <p style="margin: 0;"><strong>Hours:</strong> Mon-Fri 9am - 6pm</p>
      </div>
      <p>Thank you for choosing us for your audio repair needs!</p>
    </div>
  `;
};

const getPickupTemplate = (clientName, deviceName, claimNumber) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <h2 style="color: #059669;">Ready for Pickup</h2>
      <p>Hello ${clientName},</p>
      <p>Good news! Your <strong>${deviceName}</strong> (Claim #${claimNumber}) is ready for pickup.</p>
      <p>The repair has been completed and tested.</p>
      <div style="background-color: #f4f4f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Total Due:</strong> Please check with the front desk.</p>
        <p style="margin: 0;"><strong>Shop Address:</strong> 123 Audio Lane, Sound City</p>
      </div>
      <p>We look forward to seeing you!</p>
    </div>
  `;
};

module.exports = {
  sendEmail,
  getEstimateTemplate,
  getPickupTemplate
};
