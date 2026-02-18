const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const crypto = require('crypto');
const db = require('../db');
const { sendEmail } = require('../lib/email');

const MessagingResponse = twilio.twiml.MessagingResponse;

// Twilio sends application/x-www-form-urlencoded
router.use(express.urlencoded({ extended: false }));

// --- Helpers ---

function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, '');
  // US numbers: +18131234567 -> 8131234567
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.substring(1);
  }
  return digits;
}

async function findClientByPhone(phone) {
  // Search client_phones first
  const phoneResult = await db.query(
    `SELECT c.id, c.name, c.sms_opted_in
     FROM client_phones cp
     JOIN clients c ON cp.client_id = c.id
     WHERE cp.phone_number = $1
     LIMIT 1`,
    [phone]
  );
  if (phoneResult.rows.length > 0) {
    return phoneResult.rows[0];
  }

  // Fallback to legacy clients.phone
  const legacyResult = await db.query(
    `SELECT id, name, sms_opted_in FROM clients WHERE phone = $1 LIMIT 1`,
    [phone]
  );
  return legacyResult.rows.length > 0 ? legacyResult.rows[0] : null;
}

async function handleOptOut(clientId) {
  if (clientId) {
    await db.query('UPDATE clients SET sms_opted_in = FALSE WHERE id = $1', [clientId]);
  }
}

async function handleOptIn(clientId) {
  if (clientId) {
    await db.query('UPDATE clients SET sms_opted_in = TRUE WHERE id = $1', [clientId]);
  }
}

async function tryApproveEstimate(clientId, phone) {
  // Find the most recent outbound estimate SMS sent to this phone
  const smsResult = await db.query(
    `SELECT repair_id FROM sms_messages
     WHERE direction = 'outbound'
       AND message_type = 'estimate'
       AND to_number = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [phone]
  );

  if (smsResult.rows.length === 0) return null;

  const repairId = smsResult.rows[0].repair_id;
  if (!repairId) return null;

  // Confirm repair is currently awaiting estimate approval
  const repairResult = await db.query(
    `SELECT id, status, brand, model, claim_number FROM repairs WHERE id = $1`,
    [repairId]
  );
  if (repairResult.rows.length === 0) return null;
  const repair = repairResult.rows[0];
  if (repair.status !== 'estimate') return null;

  // Find the most recent pending estimate for that repair
  const estResult = await db.query(
    `SELECT id, labor_cost, parts_cost, total_cost
     FROM estimates
     WHERE repair_id = $1 AND status = 'pending'
     ORDER BY created_at DESC
     LIMIT 1`,
    [repairId]
  );

  if (estResult.rows.length === 0) return null;

  const estimate = estResult.rows[0];
  const now = new Date().toISOString();

  // 1. Approve this estimate
  await db.query(
    `UPDATE estimates SET status = 'approved', approved_date = $1, notified_date = $1 WHERE id = $2`,
    [now, estimate.id]
  );

  // 2. Deny all other pending estimates for this repair
  await db.query(
    `UPDATE estimates SET status = 'declined', notified_date = $1
     WHERE repair_id = $2 AND id != $3 AND status NOT IN ('approved', 'declined')`,
    [now, repairId, estimate.id]
  );

  // 3. Update repair status + labor cost
  await db.query(
    `UPDATE repairs SET status = 'repairing', labor_cost = $1 WHERE id = $2`,
    [estimate.labor_cost, repairId]
  );

  // 4. Add parts cost as custom repair part if > 0
  if (parseFloat(estimate.parts_cost) > 0) {
    await db.query(
      `INSERT INTO repair_parts (repair_id, part_id, quantity, unit_price, name)
       VALUES ($1, NULL, 1, $2, 'Approved Estimate Parts')`,
      [repairId, estimate.parts_cost]
    );
  }

  // 5. System note
  await db.query(
    `INSERT INTO repair_notes (repair_id, text, author) VALUES ($1, $2, 'System')`,
    [repairId, `Estimate #${estimate.id} approved via SMS. Status set to Repairing.`]
  );

  return { brand: repair.brand, model: repair.model, total: parseFloat(estimate.total_cost) };
}

async function tryDenyEstimate(clientId, phone) {
  // Find the most recent outbound estimate SMS sent to this phone
  const smsResult = await db.query(
    `SELECT repair_id FROM sms_messages
     WHERE direction = 'outbound'
       AND message_type = 'estimate'
       AND to_number = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [phone]
  );

  if (smsResult.rows.length === 0) return null;

  const repairId = smsResult.rows[0].repair_id;
  if (!repairId) return null;

  // Confirm repair is currently awaiting estimate approval
  const repairResult = await db.query(
    `SELECT id, status, brand, model, claim_number FROM repairs WHERE id = $1`,
    [repairId]
  );
  if (repairResult.rows.length === 0) return null;
  const repair = repairResult.rows[0];
  if (repair.status !== 'estimate') return null;

  // Find the most recent pending estimate for that repair
  const estResult = await db.query(
    `SELECT id FROM estimates
     WHERE repair_id = $1 AND status = 'pending'
     ORDER BY created_at DESC
     LIMIT 1`,
    [repairId]
  );

  if (estResult.rows.length === 0) return null;

  const estimateId = estResult.rows[0].id;
  const now = new Date().toISOString();

  // 1. Decline this estimate
  await db.query(
    `UPDATE estimates SET status = 'declined', notified_date = $1 WHERE id = $2`,
    [now, estimateId]
  );

  // 2. Set repair status to repairing (unit needs to be reassembled before pickup)
  await db.query(
    `UPDATE repairs SET status = 'repairing' WHERE id = $1`,
    [repairId]
  );

  // 3. Technician note
  await db.query(
    `INSERT INTO repair_notes (repair_id, text, author) VALUES ($1, $2, 'Technician')`,
    [repairId, `Customer sent a text denying the repair for Claim #${repair.claim_number}. Estimate #${estimateId} declined. Unit needs to be reassembled before pickup.`]
  );

  return { brand: repair.brand, model: repair.model };
}

async function logSmsMessage({ messageSid, direction, fromNumber, toNumber, body, clientId, repairId, messageType }) {
  await db.query(
    `INSERT INTO sms_messages (message_sid, direction, from_number, to_number, body, client_id, repair_id, message_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [messageSid, direction, fromNumber, toNumber, body, clientId, repairId, messageType]
  );
}

// --- Twilio Signature Validation Middleware ---

function validateTwilioSignature(req, res, next) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error('TWILIO_AUTH_TOKEN not set, rejecting webhook');
    return res.status(403).send('Forbidden');
  }

  const signature = req.headers['x-twilio-signature'];
  if (!signature) {
    console.warn('Missing x-twilio-signature header');
    return res.status(403).send('Forbidden');
  }

  // Use TWILIO_WEBHOOK_URL because the server may be behind DuckDNS/proxy
  const url = process.env.TWILIO_WEBHOOK_URL;
  if (!url) {
    console.error('TWILIO_WEBHOOK_URL not set, cannot validate signature');
    return res.status(500).send('Server misconfigured');
  }

  // Manual HMAC-SHA1 validation (matches Twilio's algorithm exactly)
  const sortedKeys = Object.keys(req.body).sort();
  let sigStr = url;
  for (const key of sortedKeys) sigStr += key + req.body[key];
  const computed = crypto.createHmac('sha1', authToken).update(sigStr, 'utf8').digest('base64');
  const isValid = computed === signature;

  if (!isValid) {
    console.warn('Invalid Twilio signature');
    console.warn('Expected:', computed, '| Got:', signature);
    return res.status(403).send('Forbidden');
  }

  next();
}

// --- Keyword Sets ---

const OPT_OUT_KEYWORDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']);
const OPT_IN_KEYWORDS = new Set(['START', 'UNSTOP']);

// --- Webhook Endpoint ---

router.post('/incoming', validateTwilioSignature, async (req, res) => {
  const twiml = new MessagingResponse();

  try {
    const from = req.body.From || '';
    const body = (req.body.Body || '').trim();
    const messageSid = req.body.MessageSid || '';

    const normalizedPhone = normalizePhone(from);
    const keyword = body.toUpperCase();

    // Look up client
    const client = await findClientByPhone(normalizedPhone);
    const clientId = client ? client.id : null;

    // Classify and process
    let messageType = 'general';

    if (OPT_OUT_KEYWORDS.has(keyword)) {
      messageType = 'opt_out';
      await handleOptOut(clientId);
      // No TwiML reply — Twilio handles STOP responses natively

    } else if (keyword === 'APPROVE' && clientId) {
      const approved = await tryApproveEstimate(clientId, normalizedPhone);
      if (approved) {
        messageType = 'estimate_approval';
        twiml.message(`Thank you! Your repair for ${approved.brand} ${approved.model} has been approved for $${approved.total.toFixed(2)} and we will begin working on it. We will notify you when it is ready for pickup.`);
      }

    } else if (keyword === 'DENY' && clientId) {
      const denied = await tryDenyEstimate(clientId, normalizedPhone);
      if (denied) {
        messageType = 'estimate_denial';
        twiml.message(`Understood. We will notify you when your ${denied.brand} ${denied.model} is ready for pickup. Please call us at 813-985-1120 if you have any questions.`);
      }

    } else if ((keyword === 'YES' || keyword === 'Y') && clientId) {
      messageType = 'opt_in';
      await handleOptIn(clientId);
      twiml.message('You have been opted in for text notifications from Sound Technology Inc. Reply STOP to unsubscribe.');

    } else if (OPT_IN_KEYWORDS.has(keyword)) {
      messageType = 'opt_in';
      await handleOptIn(clientId);
      twiml.message('You have been opted in for text notifications from Sound Technology Inc. Reply STOP to unsubscribe.');

    }
    // else: messageType stays 'general', no reply

    // Log every incoming message
    await logSmsMessage({
      messageSid,
      direction: 'inbound',
      fromNumber: normalizedPhone,
      toNumber: normalizePhone(req.body.To || ''),
      body,
      clientId,
      repairId: null,
      messageType,
    });

    // Notify staff of every inbound SMS
    try {
      const clientLabel = client ? client.name : 'Unknown Client';
      const subject = `New SMS from ${clientLabel} (${normalizedPhone})`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #d97706;">Incoming Text Message</h2>
          <table style="width:100%; border-collapse:collapse;">
            <tr><td style="padding:6px 0;"><strong>Client:</strong></td><td>${clientLabel}</td></tr>
            <tr><td style="padding:6px 0;"><strong>Phone:</strong></td><td>${normalizedPhone}</td></tr>
            <tr><td style="padding:6px 0;"><strong>Message Type:</strong></td><td>${messageType}</td></tr>
            <tr><td style="padding:6px 0;"><strong>Received:</strong></td><td>${new Date().toLocaleString()}</td></tr>
          </table>
          <div style="background:#f4f4f5; padding:15px; border-radius:5px; margin:20px 0;">
            <p style="margin:0;"><strong>Message:</strong></p>
            <p style="margin:8px 0 0;">${body}</p>
          </div>
        </div>`;
      await sendEmail('service@soundtechnologyinc.com', subject, html);
    } catch (emailErr) {
      console.error('Failed to send SMS notification email:', emailErr);
    }

  } catch (err) {
    console.error('SMS Webhook Error:', err);
    // Still return valid TwiML on error
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

module.exports = router;
