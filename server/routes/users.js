const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// GET /api/users/public-list - Public list of users for login dropdown
router.get('/public-list', async (req, res) => {
  try {
    const result = await db.query('SELECT id, username, name, role FROM users ORDER BY name ASC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// GET /api/users - List users (Admin only or for technician list)
// For security, if not admin, only return minimal technician info
router.get('/', verifyToken, async (req, res) => {
  try {
    const { role } = req.query;
    
    // If requesting list of technicians, allow any authenticated user
    if (role === 'technician') {
      // Include admins as potential technicians
      const result = await db.query("SELECT name FROM users WHERE role IN ('technician', 'admin') ORDER BY name ASC");
      return res.json(result.rows.map(u => u.name));
    }

    // Otherwise, must be admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query('SELECT id, username, name, role, created_at FROM users ORDER BY name ASC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// POST /api/users - Create User (Admin only)
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { username, password, name, role } = req.body;

    if (!(username && password && name && role)) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if user exists
    const existing = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "User already exists" });
    }

    // Hash password
    const encryptedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      'INSERT INTO users (username, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id, username, name, role',
      [username, encryptedPassword, name, role]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// DELETE /api/users/:id - Delete User (Admin only)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent self-deletion
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    await db.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: "User deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// PUT /api/users/:id/password - Reset User Password (Admin only)
router.put('/:id/password', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    // Hash new password
    const encryptedPassword = await bcrypt.hash(password, 10);

    await db.query('UPDATE users SET password = $1 WHERE id = $2', [encryptedPassword, id]);
    
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

module.exports = router;
