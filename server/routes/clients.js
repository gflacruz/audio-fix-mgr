const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper to format client
const formatClient = (row) => ({
  id: row.id,
  name: row.name,
  companyName: row.company_name,
  phone: row.phone,
  email: row.email,
  address: row.address,
  city: row.city,
  state: row.state,
  zip: row.zip,
  dateAdded: row.created_at
});

// GET /api/clients - Search or List clients
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let queryText = 'SELECT * FROM clients';
    let params = [];

    if (search) {
      queryText += ' WHERE name ILIKE $1 OR phone LIKE $1';
      params.push(`%${search}%`);
    }

    queryText += ' ORDER BY name ASC LIMIT 100';

    const result = await db.query(queryText, params);
    res.json(result.rows.map(formatClient));
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/clients/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM clients WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(formatClient(result.rows[0]));
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/clients - Create new client
router.post('/', async (req, res) => {
  try {
    const { name, companyName, phone, email, address, city, state, zip } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and Phone are required' });
    }

    const result = await db.query(
      `INSERT INTO clients (name, company_name, phone, email, address, city, state, zip) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [name, companyName, phone, email, address, city, state, zip]
    );

    res.status(201).json(formatClient(result.rows[0]));
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
    const allowedFields = ['name', 'companyName', 'phone', 'email', 'address', 'city', 'state', 'zip'];
    const fieldsToUpdate = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        const dbField = key === 'companyName' ? 'company_name' : key;
        fieldsToUpdate.push(`${dbField} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id);
    const query = `UPDATE clients SET ${fieldsToUpdate.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(formatClient(result.rows[0]));
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
