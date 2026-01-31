const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// GET /api/parts - List all parts (Searchable)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT p.*, 
             (SELECT COALESCE(json_agg(alias), '[]') FROM part_aliases WHERE part_id = p.id) as aliases
      FROM parts p
    `;
    
    const params = [];
    
    if (search) {
      query += ` 
        WHERE p.name ILIKE $1 
        OR EXISTS (SELECT 1 FROM part_aliases pa WHERE pa.part_id = p.id AND pa.alias ILIKE $1)
      `;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY p.name ASC`;

    const result = await db.query(query, params);
    
    // Format response (camelCase)
    const parts = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      retailPrice: parseFloat(row.retail_price),
      wholesalePrice: parseFloat(row.wholesale_price),
      quantityInStock: row.quantity_in_stock,
      aliases: row.aliases
    }));

    res.json(parts);
  } catch (error) {
    console.error('Error fetching parts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/parts - Create a new part (Admin only)
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { name, retailPrice, wholesalePrice, quantityInStock, aliases } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Part name is required' });
    }

    await client.query('BEGIN');

    // Insert Part
    const partResult = await client.query(
      'INSERT INTO parts (name, retail_price, wholesale_price, quantity_in_stock) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, retailPrice || 0, wholesalePrice || 0, quantityInStock || 0]
    );
    const part = partResult.rows[0];

    // Insert Aliases
    if (aliases && Array.isArray(aliases) && aliases.length > 0) {
      for (const alias of aliases) {
        await client.query('INSERT INTO part_aliases (part_id, alias) VALUES ($1, $2)', [part.id, alias]);
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      id: part.id,
      name: part.name,
      retailPrice: parseFloat(part.retail_price),
      wholesalePrice: parseFloat(part.wholesale_price),
      quantityInStock: part.quantity_in_stock,
      aliases: aliases || []
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating part:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// PATCH /api/parts/:id - Update part (Admin only)
router.patch('/:id', verifyToken, verifyAdmin, async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { name, retailPrice, wholesalePrice, quantityInStock, aliases } = req.body;

    await client.query('BEGIN');

    // Update Part
    const partResult = await client.query(
      'UPDATE parts SET name = $1, retail_price = $2, wholesale_price = $3, quantity_in_stock = $4 WHERE id = $5 RETURNING *',
      [name, retailPrice, wholesalePrice, quantityInStock, id]
    );

    if (partResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Part not found' });
    }

    // Update Aliases (Delete all and re-insert)
    await client.query('DELETE FROM part_aliases WHERE part_id = $1', [id]);

    if (aliases && Array.isArray(aliases) && aliases.length > 0) {
      for (const alias of aliases) {
        await client.query('INSERT INTO part_aliases (part_id, alias) VALUES ($1, $2)', [id, alias]);
      }
    }

    await client.query('COMMIT');

    const part = partResult.rows[0];
    res.json({
      id: part.id,
      name: part.name,
      retailPrice: parseFloat(part.retail_price),
      wholesalePrice: parseFloat(part.wholesale_price),
      quantityInStock: part.quantity_in_stock,
      aliases: aliases || []
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating part:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// DELETE /api/parts/:id - Delete part (Admin only)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // Note: ON DELETE CASCADE in schema handles aliases and repair_links automatically?
    // In inventory.sql:
    // part_aliases: ON DELETE CASCADE - Yes
    // repair_parts: part_id REFERENCES parts(id) - No CASCADE specified for part_id deletion?
    // Wait, let me check the schema I wrote.
    
    await db.query('DELETE FROM parts WHERE id = $1', [id]);
    res.json({ message: 'Part deleted successfully' });
  } catch (error) {
    // If foreign key constraint fails (used in repairs), we might want to block deletion or handle it.
    console.error('Error deleting part:', error);
    if (error.code === '23503') {
       return res.status(400).json({ error: 'Cannot delete part because it is used in repair tickets.' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
