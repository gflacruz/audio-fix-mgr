-- Inventory Parts Table
CREATE TABLE IF NOT EXISTS parts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  retail_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  wholesale_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  quantity_in_stock INTEGER DEFAULT 0,
  location VARCHAR(255),
  description TEXT,
  image_url TEXT,
  image_public_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Part Aliases Table (Many-to-One with parts)
CREATE TABLE IF NOT EXISTS part_aliases (
  id SERIAL PRIMARY KEY,
  part_id INTEGER REFERENCES parts(id) ON DELETE CASCADE,
  alias VARCHAR(255) NOT NULL
);

-- Repair Parts Linking Table (Parts used in a repair)
CREATE TABLE IF NOT EXISTS repair_parts (
  id SERIAL PRIMARY KEY,
  repair_id INTEGER REFERENCES repairs(id) ON DELETE CASCADE,
  part_id INTEGER REFERENCES parts(id),
  name VARCHAR(255), -- For custom parts or snapshot of part name
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL, -- Snapshot of retail_price at time of use
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
