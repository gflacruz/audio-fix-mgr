const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      db_time: result.rows[0].now 
    });
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/repairs', require('./routes/repairs'));
app.use('/api/parts', require('./routes/parts'));
app.use('/api/suggestions', require('./routes/suggestions'));

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log(`Network access enabled: http://0.0.0.0:${port}`);
});
