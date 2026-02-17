const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const db = require('../db');

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

  if (smsResult.rows.length === 0) {
    return false;
  }

  const repairId = smsResult.rows[0].repair_id;
  if (!repairId) return false;

  // Find pending estimate for that repair
  const estResult = await db.query(
    `SELECT id, labor_cost, parts_cost, total_cost
     FROM estimates
     WHERE repair_id = $1 AND status = 'pending'
     ORDER BY created_at DESC
     LIMIT 1`,
    [repairId]
  );

  if (estResult.rows.length === 0) {
    return false;
  }

  const estimate = estResult.rows[0];
  const now = new Date().toISOString();

  // 1. Approve estimate
  await db.query(
    `UPDATE estimates SET status = 'approved', approved_date = $1, notified_date = $1 WHERE id = $2`,
    [now, estimate.id]
  );

  // 2. Update repair status + labor cost
  await db.query(
    `UPDATE repairs SET status = 'repairing', labor_cost = $1 WHERE id = $2`,
    [estimate.labor_cost, repairId]
  );

  // 3. Add parts cost as custom repair part if > 0
  if (parseFloat(estimate.parts_cost) > 0) {
    await db.query(
      `INSERT INTO repair_parts (repair_id, part_id, quantity, unit_price, name)
       VALUES ($1, NULL, 1, $2, 'Approved Estimate Parts')`,
      [repairId, estimate.parts_cost]
    );
  }

  // 4. System note
  await db.query(
    `INSERT INTO repair_notes (repair_id, text, author) VALUES ($1, $2, 'System')`,
    [repairId, `Estimate #${estimate.id} approved via SMS. Status set to Repairing.`]
  );

  return true;
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

  const isValid = twilio.validateRequest(authToken, signature, url, req.body);
  if (!isValid) {
    console.warn('Invalid Twilio signature');
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

    } else if (keyword === 'YES' && clientId) {
      const approved = await tryApproveEstimate(clientId, normalizedPhone);
      if (approved) {
        messageType = 'estimate_approval';
        twiml.message('Your estimate has been approved. We will begin work on your repair. Thank you!');
      } else {
        messageType = 'opt_in';
        await handleOptIn(clientId);
        twiml.message('You have been opted in to text updates. Reply STOP to opt out.');
      }

    } else if (OPT_IN_KEYWORDS.has(keyword)) {
      messageType = 'opt_in';
      await handleOptIn(clientId);
      twiml.message('You have been opted in to text updates. Reply STOP to opt out.');

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

  } catch (err) {
    console.error('SMS Webhook Error:', err);
    // Still return valid TwiML on error
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

module.exports = router;
