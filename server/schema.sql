-- Sequence for claim numbers (Starting from 111000 per your request)
CREATE SEQUENCE IF NOT EXISTS claim_number_seq START 111000;

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  phone VARCHAR(50), -- Legacy primary phone
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
);

CREATE TABLE IF NOT EXISTS client_phones (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  phone_number VARCHAR(50) NOT NULL,
  type VARCHAR(50) DEFAULT 'Cell',
  extension VARCHAR(20),
  is_primary BOOLEAN DEFAULT FALSE
);

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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repair_photos (
  id SERIAL PRIMARY KEY,
  repair_id INTEGER REFERENCES repairs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  public_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repair_notes (
  id SERIAL PRIMARY KEY,
  repair_id INTEGER REFERENCES repairs(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  author VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
  low_limit INTEGER DEFAULT 0,
  on_order INTEGER DEFAULT 0,
  best_price_quality VARCHAR(100),
  unit_of_issue VARCHAR(50),
  last_supplier VARCHAR(255),
  supply_source VARCHAR(255),
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS part_aliases (
  id SERIAL PRIMARY KEY,
  part_id INTEGER REFERENCES parts(id) ON DELETE CASCADE,
  alias VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS repair_parts (
  id SERIAL PRIMARY KEY,
  repair_id INTEGER REFERENCES repairs(id) ON DELETE CASCADE,
  part_id INTEGER REFERENCES parts(id),
  name VARCHAR(255),
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'technician')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suggestions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
);

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
);

CREATE INDEX IF NOT EXISTS idx_sms_messages_client_id ON sms_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_from_number ON sms_messages(from_number);

CREATE OR REPLACE FUNCTION update_estimates_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_estimates_updated_at ON estimates;
CREATE TRIGGER update_estimates_updated_at
BEFORE UPDATE ON estimates
FOR EACH ROW
EXECUTE PROCEDURE update_estimates_updated_at_column();
