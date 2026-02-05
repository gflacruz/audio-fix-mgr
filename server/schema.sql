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
  diagnostic_fee_collected BOOLEAN DEFAULT FALSE,
  deposit_amount DECIMAL(10, 2) DEFAULT 0.00,
  is_on_site BOOLEAN DEFAULT FALSE,
  is_shipped_in BOOLEAN DEFAULT FALSE,
  shipping_carrier VARCHAR(100),
  box_height INTEGER,
  box_length INTEGER,
  box_width INTEGER,
  model_version VARCHAR(100),
  accessories_included TEXT,
  work_performed TEXT,
  labor_cost DECIMAL(10, 2) DEFAULT 0.00,
  return_shipping_cost DECIMAL(10, 2) DEFAULT 0.00,
  return_shipping_carrier VARCHAR(100),
  is_tax_exempt BOOLEAN DEFAULT FALSE,
  paid_out BOOLEAN DEFAULT FALSE,
  paid_out_date TIMESTAMP,
  paid_to VARCHAR(100),
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

CREATE TABLE IF NOT EXISTS suggestions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
