-- Sequence for claim numbers (Starting from 111000 per your request)
CREATE SEQUENCE IF NOT EXISTS claim_number_seq START 111000;

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repairs (
  id SERIAL PRIMARY KEY,
  claim_number INTEGER DEFAULT nextval('claim_number_seq') UNIQUE,
  client_id INTEGER REFERENCES clients(id),
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  serial VARCHAR(100),
  unit_type VARCHAR(50),
  issue TEXT,
  priority VARCHAR(20) DEFAULT 'normal',
  status VARCHAR(50) DEFAULT 'queued',
  technician VARCHAR(50) DEFAULT 'Unassigned',
  diagnostic_fee_collected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repair_notes (
  id SERIAL PRIMARY KEY,
  repair_id INTEGER REFERENCES repairs(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  author VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
