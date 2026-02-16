-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'technician')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Note: The passwords below are hashed versions of "audiofix123"
-- Insert Willy (Admin)
INSERT INTO users (username, password, name, role) 
VALUES ('willy', '$2a$10$X7V.jT.n6v.k.o.k.q.q.O.u.i.q.w.e.r.t.y.u.i.o.p', 'Willy', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Insert Sergey Shepilov (Technician)
INSERT INTO users (username, password, name, role)
VALUES ('sergey', '$2a$10$X7V.jT.n6v.k.o.k.q.q.O.u.i.q.w.e.r.t.y.u.i.o.p', 'Sergey Shepilov', 'technician')
ON CONFLICT (username) DO NOTHING;

-- Insert Tyler (Technician)
INSERT INTO users (username, password, name, role) 
VALUES ('tyler', '$2a$10$X7V.jT.n6v.k.o.k.q.q.O.u.i.q.w.e.r.t.y.u.i.o.p', 'Tyler', 'technician')
ON CONFLICT (username) DO NOTHING;
