const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


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
app.use('/api/estimates', require('./routes/estimates'));
app.use('/api/sms', require('./routes/sms'));


// Run migrations
(async () => {
  try {
    await db.query('ALTER TABLE repairs ADD COLUMN IF NOT EXISTS payout_batch_id UUID');
    await db.query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS sms_opted_in BOOLEAN DEFAULT FALSE');
    await db.query(`
      CREATE TABLE IF NOT EXISTS sms_messages (
        id SERIAL PRIMARY KEY,
        message_sid VARCHAR(64),
        direction VARCHAR(10) NOT NULL DEFAULT 'inbound',
        from_number VARCHAR(50) NOT NULL,
        to_number VARCHAR(50),
        body TEXT,
        client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
        repair_id INTEGER REFERENCES repairs(id) ON DELETE SET NULL,
        message_type VARCHAR(30) DEFAULT 'general',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS model_notes (
        id SERIAL PRIMARY KEY,
        brand VARCHAR(255) NOT NULL,
        model VARCHAR(255) NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        updated_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_model_notes_brand_model
        ON model_notes (LOWER(brand), LOWER(model))
    `);
  } catch (err) {
    console.error('Migration error:', err.message);
  }
})();

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log(`Network access enabled: http://0.0.0.0:${port}`);
});
