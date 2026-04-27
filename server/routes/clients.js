const express = require('express');
const router = express.Router();
const db = require('../db');
const twilio = require('twilio');
const { verifyToken } = require('../middleware/auth');

const twilioClient = process.env.TWILIO_ACCOUNT_SID
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Helper to format client
const formatClient = (row, phones = []) => ({
  id: row.id,
  name: row.name,
  companyName: row.company_name,
  phone: row.phone, // Legacy primary phone
  phones: phones,   // New array of phones
  email: row.email,
  address: row.address,
  city: row.city,
  state: row.state,
  zip: row.zip,
  primaryNotification: row.primary_notification || 'Phone',
  taxExempt: row.tax_exempt || false,
  smsOptedIn: row.sms_opted_in || false,
  remarks: row.remarks,
  dateAdded: row.created_at
});

// GET /api/clients - Search or List clients
router.get('/', async (req, res) => {
  try {
    const { search, page, limit } = req.query;
    
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 100;
    const offset = (pageNum - 1) * limitNum;

    let queryText = 'SELECT * FROM clients';
    let params = [];

    if (search) {
      // Search by name, company, email, or ANY associated phone number
      queryText += ` 
        WHERE name ILIKE $1 
        OR company_name ILIKE $1
        OR email ILIKE $1
        OR EXISTS (
          SELECT 1 FROM client_phones 
          WHERE client_phones.client_id = clients.id 
          AND phone_number LIKE $1
        )
      `;
      params.push(`%${search}%`);
    }

    queryText += ` ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limitNum, offset);

    const result = await db.query(queryText, params);
    res.json(result.rows.map(row => formatClient(row)));
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/clients/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const clientResult = await db.query('SELECT * FROM clients WHERE id = $1', [id]);
    
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Fetch phones
    const phonesResult = await db.query(
      'SELECT * FROM client_phones WHERE client_id = $1 ORDER BY is_primary DESC, id ASC',
      [id]
    );

    const phones = phonesResult.rows.map(p => ({
      number: p.phone_number,
      type: p.type,
      extension: p.extension,
      isPrimary: p.is_primary
    }));

    // Calculate Total Spent (Closed tickets only)
    // Formula: labor + parts + 7.5% tax (if not tax exempt)
    const totalSpentQuery = `
      WITH client_closed_repairs AS (
        SELECT r.id, r.labor_cost, r.is_tax_exempt,
          COALESCE((
            SELECT SUM(rp.quantity * rp.unit_price)
            FROM repair_parts rp
            WHERE rp.repair_id = r.id
          ), 0) AS parts_cost
        FROM repairs r
        WHERE r.client_id = $1 AND r.status = 'closed'
      )
      SELECT COALESCE(SUM(
        r.labor_cost + r.parts_cost +
        CASE WHEN r.is_tax_exempt THEN 0 ELSE (r.labor_cost + r.parts_cost) * 0.075 END
      ), 0) AS grand_total
      FROM client_closed_repairs r
    `;
    
    const totalSpentResult = await db.query(totalSpentQuery, [id]);
    const totalSpent = parseFloat(totalSpentResult.rows[0]?.grand_total || 0);

    const clientData = formatClient(clientResult.rows[0], phones);
    clientData.totalSpent = totalSpent;

    res.json(clientData);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/clients - Create new client
router.post('/', async (req, res) => {
  try {
    const { name, companyName, phones, email, address, city, state, zip, primaryNotification, remarks, taxExempt } = req.body;

    // Backward compatibility: if "phone" string is sent instead of "phones" array
    let phoneList = phones;
    if (!phones && req.body.phone) {
      phoneList = [{ number: req.body.phone, type: 'Cell', isPrimary: true }];
    }

    if (!name || !phoneList || phoneList.length === 0) {
      return res.status(400).json({ error: 'Name and at least one Phone Number are required' });
    }

    const primaryPhone = phoneList[0].number;

    const result = await db.query(
      `INSERT INTO clients (name, company_name, phone, email, address, city, state, zip, primary_notification, remarks, tax_exempt)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [name, companyName, primaryPhone, email, address, city, state, zip, primaryNotification || 'Phone', remarks || '', taxExempt || false]
    );

    const clientId = result.rows[0].id;

    // Insert phones
    for (let i = 0; i < phoneList.length; i++) {
      const p = phoneList[i];
      await db.query(
        `INSERT INTO client_phones (client_id, phone_number, type, extension, is_primary)
         VALUES ($1, $2, $3, $4, $5)`,
        [clientId, p.number, p.type || 'Cell', p.extension || '', i === 0] // First one is primary
      );
    }

    // Fetch back full object
    const savedPhones = await db.query(
        'SELECT * FROM client_phones WHERE client_id = $1 ORDER BY is_primary DESC',
        [clientId]
    );
    
    const formattedPhones = savedPhones.rows.map(p => ({
        number: p.phone_number,
        type: p.type,
        extension: p.extension,
        isPrimary: p.is_primary
    }));

    res.status(201).json(formatClient(result.rows[0], formattedPhones));
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// PATCH /api/clients/:id - Update client
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Whitelist allowed fields
    const allowedFields = ['name', 'companyName', 'email', 'address', 'city', 'state', 'zip', 'primaryNotification', 'remarks', 'taxExempt', 'smsOptedIn'];
    const fieldsToUpdate = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        let dbField = key;
        if (key === 'companyName') dbField = 'company_name';
        if (key === 'primaryNotification') dbField = 'primary_notification';
        if (key === 'taxExempt') dbField = 'tax_exempt';
        if (key === 'smsOptedIn') dbField = 'sms_opted_in';
        
        fieldsToUpdate.push(`${dbField} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    // Handle phones update separately if present
    if (updates.phones && Array.isArray(updates.phones)) {
        // 1. Update primary phone in main table (for backward compat)
        if (updates.phones.length > 0) {
            fieldsToUpdate.push(`phone = $${paramIndex}`);
            values.push(updates.phones[0].number);
            paramIndex++;
        }

        // 2. Replace phones in client_phones
        await db.query('DELETE FROM client_phones WHERE client_id = $1', [id]);
        
        for (let i = 0; i < updates.phones.length; i++) {
            const p = updates.phones[i];
            await db.query(
                `INSERT INTO client_phones (client_id, phone_number, type, extension, is_primary)
                 VALUES ($1, $2, $3, $4, $5)`,
                [id, p.number, p.type || 'Cell', p.extension || '', i === 0]
            );
        }
    }

    let clientRow;
    if (fieldsToUpdate.length > 0) {
      values.push(id);
      const query = `UPDATE clients SET ${fieldsToUpdate.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      const result = await db.query(query, values);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Client not found' });
      }
      clientRow = result.rows[0];
    } else {
        // Just fetch if only phones were updated (or nothing)
        const result = await db.query('SELECT * FROM clients WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
        clientRow = result.rows[0];
    }

    // Fetch updated phones
    const phonesResult = await db.query(
        'SELECT * FROM client_phones WHERE client_id = $1 ORDER BY is_primary DESC',
        [id]
    );

    const phones = phonesResult.rows.map(p => ({
        number: p.phone_number,
        type: p.type,
        extension: p.extension,
        isPrimary: p.is_primary
    }));

    res.json(formatClient(clientRow, phones));
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// DELETE /api/clients/:id - Delete client
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if client exists
    const checkResult = await db.query('SELECT id FROM clients WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Delete (Cascade will handle phones, repairs, photos, notes)
    await db.query('DELETE FROM clients WHERE id = $1', [id]);
    
    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/clients/:id/merge/:sourceId - Merge sourceId into id (keeps id, deletes sourceId)
router.post('/:id/merge/:sourceId', async (req, res) => {
  const { id, sourceId } = req.params;
  if (id === sourceId) return res.status(400).json({ error: 'Cannot merge a client with itself' });

  try {
    // Verify both clients exist
    const [targetRes, sourceRes] = await Promise.all([
      db.query('SELECT * FROM clients WHERE id = $1', [id]),
      db.query('SELECT * FROM clients WHERE id = $1', [sourceId]),
    ]);
    if (targetRes.rows.length === 0) return res.status(404).json({ error: 'Target client not found' });
    if (sourceRes.rows.length === 0) return res.status(404).json({ error: 'Source client not found' });

    const target = targetRes.rows[0];
    const source = sourceRes.rows[0];

    // Re-assign all repairs from source → target
    await db.query('UPDATE repairs SET client_id = $1 WHERE client_id = $2', [id, sourceId]);

    // Re-assign all sms_messages from source → target
    await db.query('UPDATE sms_messages SET client_id = $1 WHERE client_id = $2', [id, sourceId]);

    // Merge phone numbers (add source phones not already on target)
    const targetPhones = await db.query('SELECT phone_number FROM client_phones WHERE client_id = $1', [id]);
    const targetNums = new Set(targetPhones.rows.map(r => r.phone_number.replace(/\D/g, '')));

    const sourcePhones = await db.query('SELECT * FROM client_phones WHERE client_id = $1', [sourceId]);
    for (const p of sourcePhones.rows) {
      const clean = p.phone_number.replace(/\D/g, '');
      if (!targetNums.has(clean)) {
        await db.query(
          `INSERT INTO client_phones (client_id, phone_number, type, extension, is_primary)
           VALUES ($1, $2, $3, $4, false)`,
          [id, p.phone_number, p.type, p.extension]
        );
      }
    }

    // Fill in any missing fields on target from source
    const fills = {};
    if (!target.email && source.email) fills.email = source.email;
    if (!target.address && source.address) fills.address = source.address;
    if (!target.city && source.city) fills.city = source.city;
    if (!target.state && source.state) fills.state = source.state;
    if (!target.zip && source.zip) fills.zip = source.zip;
    if (!target.company_name && source.company_name) fills.company_name = source.company_name;
    if (!target.remarks && source.remarks) fills.remarks = source.remarks;

    if (Object.keys(fills).length > 0) {
      const setClauses = Object.keys(fills).map((k, i) => `${k} = $${i + 2}`).join(', ');
      await db.query(
        `UPDATE clients SET ${setClauses} WHERE id = $1`,
        [id, ...Object.values(fills)]
      );
    }

    // Delete source client (phones cascade)
    await db.query('DELETE FROM clients WHERE id = $1', [sourceId]);

    // Return updated target client
    const updatedClient = await db.query('SELECT * FROM clients WHERE id = $1', [id]);
    const updatedPhones = await db.query(
      'SELECT * FROM client_phones WHERE client_id = $1 ORDER BY is_primary DESC, id ASC', [id]
    );
    const phones = updatedPhones.rows.map(p => ({
      number: p.phone_number, type: p.type, extension: p.extension, isPrimary: p.is_primary
    }));

    res.json(formatClient(updatedClient.rows[0], phones));
  } catch (error) {
    console.error('Error merging clients:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/clients/:id/sms-messages
router.get('/:id/sms-messages', verifyToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, direction, body, message_type, from_number, to_number, created_at
       FROM sms_messages
       WHERE client_id = $1
       ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching client SMS messages:', err);
    res.status(500).json({ error: 'Failed to fetch SMS messages' });
  }
});

// POST /api/clients/:id/send-opt-in - Send SMS opt-in message
router.post('/:id/send-opt-in', verifyToken, async (req, res) => {
  try {
    if (!twilioClient) {
      return res.status(500).json({ error: 'Twilio not configured on server' });
    }

    const { id } = req.params;

    const clientResult = await db.query('SELECT * FROM clients WHERE id = $1', [id]);
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    const client = clientResult.rows[0];

    // Get primary phone
    const phonesRes = await db.query(
      'SELECT phone_number FROM client_phones WHERE client_id = $1 AND is_primary = true',
      [id]
    );

    let phoneNumber = client.phone;
    if (phonesRes.rows.length > 0) {
      phoneNumber = phonesRes.rows[0].phone_number;
    }

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Client has no phone number' });
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`;

    const optInBody = `Hello ${client.name.split(' ')[0]}, this is Sound Technology Inc. Reply Yes or Y to opt in for text notifications about your repair. Msg & data rates may apply. Reply STOP to unsubscribe.`;

    const optInMsg = await twilioClient.messages.create({
      body: optInBody,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });

    // Log to sms_messages
    await db.query(
      `INSERT INTO sms_messages (message_sid, direction, from_number, to_number, body, client_id, message_type)
       VALUES ($1, 'outbound', $2, $3, $4, $5, 'opt_in')`,
      [optInMsg.sid, process.env.TWILIO_PHONE_NUMBER, formattedPhone, optInBody, id]
    );

    res.json({ message: 'Opt-in text sent' });
  } catch (error) {
    console.error('Error sending opt-in text:', error);
    res.status(500).json({ error: 'Failed to send opt-in text: ' + error.message });
  }
});

// POST /api/clients/:id/send-text - Send a custom text to the client
router.post('/:id/send-text', verifyToken, async (req, res) => {
  try {
    if (!twilioClient) {
      return res.status(500).json({ error: 'Twilio not configured on server' });
    }

    const { id } = req.params;
    const { body } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Message body is required' });
    }

    const clientResult = await db.query('SELECT * FROM clients WHERE id = $1', [id]);
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get primary phone (same pattern as send-opt-in)
    const phonesRes = await db.query(
      'SELECT phone_number FROM client_phones WHERE client_id = $1 AND is_primary = true',
      [id]
    );
    let phoneNumber = clientResult.rows[0].phone;
    if (phonesRes.rows.length > 0) phoneNumber = phonesRes.rows[0].phone_number;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Client has no phone number' });
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`;

    const message = await twilioClient.messages.create({
      body: body.trim(),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });

    // Log to sms_messages
    await db.query(
      `INSERT INTO sms_messages (message_sid, direction, from_number, to_number, body, client_id, message_type)
       VALUES ($1, 'outbound', $2, $3, $4, $5, 'general')`,
      [message.sid, process.env.TWILIO_PHONE_NUMBER, formattedPhone, body.trim(), id]
    );

    res.json({ message: 'Text sent' });
  } catch (error) {
    console.error('Error sending text:', error);
    res.status(500).json({ error: 'Failed to send text: ' + error.message });
  }
});

module.exports = router;
