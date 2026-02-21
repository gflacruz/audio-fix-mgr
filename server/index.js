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


// Run migrations — ensures all tables, columns, indexes, and triggers exist
(async () => {
  try {
    // ── Sequence ──────────────────────────────────────────────────────────────
    await db.query(`CREATE SEQUENCE IF NOT EXISTS claim_number_seq START 111000`);

    // ── Core tables ───────────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        company_name VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(50),
        zip VARCHAR(20),
        primary_notification VARCHAR(50) DEFAULT 'Phone',
        tax_exempt BOOLEAN DEFAULT FALSE,
        sms_opted_in BOOLEAN DEFAULT FALSE,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS client_phones (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        phone_number VARCHAR(50) NOT NULL,
        type VARCHAR(50) DEFAULT 'Cell',
        extension VARCHAR(20),
        is_primary BOOLEAN DEFAULT FALSE
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS repairs (
        id SERIAL PRIMARY KEY,
        claim_number VARCHAR(50),
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        brand VARCHAR(255) NOT NULL,
        model VARCHAR(255) NOT NULL,
        serial VARCHAR(255),
        unit_type VARCHAR(100),
        issue TEXT NOT NULL,
        priority VARCHAR(50) DEFAULT 'normal',
        status VARCHAR(50) DEFAULT 'checked_in',
        technician VARCHAR(100) DEFAULT 'Unassigned',
        checked_in_by VARCHAR(100),
        diagnostic_fee_collected BOOLEAN DEFAULT FALSE,
        diagnostic_fee DECIMAL(10, 2) DEFAULT 0.00,
        deposit_amount DECIMAL(10, 2) DEFAULT 0.00,
        rush_fee DECIMAL(10, 2) DEFAULT 0.00,
        on_site_fee DECIMAL(10, 2) DEFAULT 0.00,
        is_on_site BOOLEAN DEFAULT FALSE,
        is_shipped_in BOOLEAN DEFAULT FALSE,
        shipping_carrier VARCHAR(100),
        box_height INTEGER,
        box_length INTEGER,
        box_width INTEGER,
        model_version VARCHAR(100),
        accessories_included TEXT,
        po_number VARCHAR(100),
        work_performed TEXT,
        labor_cost DECIMAL(10, 2) DEFAULT 0.00,
        return_shipping_cost DECIMAL(10, 2) DEFAULT 0.00,
        return_shipping_carrier VARCHAR(100),
        is_tax_exempt BOOLEAN DEFAULT FALSE,
        paid_out BOOLEAN DEFAULT FALSE,
        paid_out_date TIMESTAMP,
        paid_to VARCHAR(100),
        payout_amount DECIMAL(10, 2),
        payout_batch_id UUID,
        completed_date TIMESTAMP,
        closed_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS repair_photos (
        id SERIAL PRIMARY KEY,
        repair_id INTEGER REFERENCES repairs(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        public_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS repair_notes (
        id SERIAL PRIMARY KEY,
        repair_id INTEGER REFERENCES repairs(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        author VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS parts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        retail_price DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
        wholesale_price DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
        quantity_in_stock INTEGER DEFAULT 0,
        location VARCHAR(255),
        description TEXT,
        image_url TEXT,
        image_public_id VARCHAR(255),
        nomenclature VARCHAR(255),
        category VARCHAR(100),
        low_limit INTEGER DEFAULT 0,
        on_order INTEGER DEFAULT 0,
        best_price_quality VARCHAR(100),
        unit_of_issue VARCHAR(50),
        last_supplier VARCHAR(255),
        supply_source VARCHAR(255),
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS part_aliases (
        id SERIAL PRIMARY KEY,
        part_id INTEGER REFERENCES parts(id) ON DELETE CASCADE,
        alias VARCHAR(255) NOT NULL
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS repair_parts (
        id SERIAL PRIMARY KEY,
        repair_id INTEGER REFERENCES repairs(id) ON DELETE CASCADE,
        part_id INTEGER REFERENCES parts(id),
        name VARCHAR(255),
        quantity INTEGER DEFAULT 1,
        unit_price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'technician')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS suggestions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS estimates (
        id SERIAL PRIMARY KEY,
        repair_id INTEGER REFERENCES repairs(id) ON DELETE CASCADE,
        diagnostic_notes TEXT,
        work_performed TEXT,
        labor_cost DECIMAL(10, 2) DEFAULT 0.00,
        parts_cost DECIMAL(10, 2) DEFAULT 0.00,
        total_cost DECIMAL(10, 2) DEFAULT 0.00,
        status VARCHAR(50) DEFAULT 'pending',
        created_technician VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notified_date TIMESTAMP,
        approved_date TIMESTAMP
      )
    `);

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

    // ── Indexes ───────────────────────────────────────────────────────────────
    await db.query(`CREATE INDEX IF NOT EXISTS idx_sms_messages_client_id ON sms_messages(client_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_sms_messages_from_number ON sms_messages(from_number)`);
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_model_notes_brand_model
        ON model_notes (LOWER(brand), LOWER(model))
    `);

    // ── Column additions for existing databases ───────────────────────────────
    await db.query(`ALTER TABLE repairs ADD COLUMN IF NOT EXISTS payout_batch_id UUID`);
    await db.query(`ALTER TABLE repairs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await db.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS sms_opted_in BOOLEAN DEFAULT FALSE`);

    // ── Trigger: estimates.updated_at ─────────────────────────────────────────
    await db.query(`
      CREATE OR REPLACE FUNCTION update_estimates_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    await db.query(`DROP TRIGGER IF EXISTS update_estimates_updated_at ON estimates`);
    await db.query(`
      CREATE TRIGGER update_estimates_updated_at
      BEFORE UPDATE ON estimates
      FOR EACH ROW
      EXECUTE PROCEDURE update_estimates_updated_at_column()
    `);

    // ── Trigger: repairs.updated_at ───────────────────────────────────────────
    await db.query(`
      CREATE OR REPLACE FUNCTION update_repairs_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    await db.query(`DROP TRIGGER IF EXISTS update_repairs_updated_at ON repairs`);
    await db.query(`
      CREATE TRIGGER update_repairs_updated_at
      BEFORE UPDATE ON repairs
      FOR EACH ROW
      EXECUTE PROCEDURE update_repairs_updated_at_column()
    `);

    console.log('Migrations complete');
  } catch (err) {
    console.error('Migration error:', err.message);
  }
})();

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log(`Network access enabled: http://0.0.0.0:${port}`);
});
