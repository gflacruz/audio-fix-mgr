const express = require('express');
const router = express.Router();
const db = require('../db');

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
  dateAdded: row.created_at
});

// GET /api/clients - Search or List clients
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
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

    queryText += ' ORDER BY name ASC LIMIT 100';

    const result = await db.query(queryText, params);
    res.json(result.rows.map(row => formatClient(row)));
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    // Sum of Labor + Diag ($89 if collected) + Parts
    const totalSpentQuery = `
      WITH client_closed_repairs AS (
        SELECT id, labor_cost, diagnostic_fee_collected
        FROM repairs
        WHERE client_id = $1 AND status = 'closed'
      )
      SELECT
        COALESCE(SUM(r.labor_cost), 0) +
        COALESCE(SUM(CASE WHEN r.diagnostic_fee_collected THEN 89.00 ELSE 0 END), 0) +
        COALESCE((
          SELECT SUM(rp.quantity * rp.unit_price)
          FROM repair_parts rp
          WHERE rp.repair_id IN (SELECT id FROM client_closed_repairs)
        ), 0) as grand_total
      FROM client_closed_repairs r
    `;
    
    const totalSpentResult = await db.query(totalSpentQuery, [id]);
    const totalSpent = parseFloat(totalSpentResult.rows[0]?.grand_total || 0);

    const clientData = formatClient(clientResult.rows[0], phones);
    clientData.totalSpent = totalSpent;

    res.json(clientData);
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/clients - Create new client
router.post('/', async (req, res) => {
  try {
    const { name, companyName, phones, email, address, city, state, zip, primaryNotification } = req.body;

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
      `INSERT INTO clients (name, company_name, phone, email, address, city, state, zip, primary_notification) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [name, companyName, primaryPhone, email, address, city, state, zip, primaryNotification || 'Phone']
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
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/clients/:id - Update client
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Whitelist allowed fields
    const allowedFields = ['name', 'companyName', 'email', 'address', 'city', 'state', 'zip', 'primaryNotification'];
    const fieldsToUpdate = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        let dbField = key;
        if (key === 'companyName') dbField = 'company_name';
        if (key === 'primaryNotification') dbField = 'primary_notification';
        
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
