const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // For admins, both username and password are required.
    // For others, only username is strictly required to identify the user.
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    let isAuthenticated = false;

    if (user.role === 'admin') {
      if (!password) {
        return res.status(400).json({ error: "Password is required for admins" });
      }
      if (await bcrypt.compare(password, user.password)) {
        isAuthenticated = true;
      }
    } else {
      // Non-admins (technicians) don't need a password
      isAuthenticated = true;
    }

    if (isAuthenticated) {
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, name: user.name },
        process.env.JWT_SECRET || 'your_jwt_secret_key',
        { expiresIn: "24h" }
      );

      // Return user info and token
      res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        token: token
      });
    } else {
      res.status(400).json({ error: "Invalid Credentials" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// GET /api/auth/me - Validate session
router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await db.query('SELECT id, username, name, role FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

module.exports = router;
