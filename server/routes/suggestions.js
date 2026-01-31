const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// Create a suggestion
router.post('/', verifyToken, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const result = await db.query(
      'INSERT INTO suggestions (user_id, content) VALUES ($1, $2) RETURNING *',
      [req.user.id, content]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating suggestion:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all suggestions (Admin only)
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.*, u.name as user_name, u.role as user_role 
      FROM suggestions s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update suggestion status (Admin only)
router.patch('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const result = await db.query(
      'UPDATE suggestions SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating suggestion:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
