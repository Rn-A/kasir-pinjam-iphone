-- Pinjam iPhone - Supabase Implementation Schema

-- 1. Tabel Users (Supabase Auth already handles users via auth.users, but we can extend if needed)
-- Note: auth.users is entirely managed by Supabase Auth and doesn't need to be created manually.
-- You can create a trigger to add rows to a public 'profiles' table when a user signs up.

-- 2. Tabel Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Items
CREATE TYPE item_status AS ENUM ('available', 'rented', 'maintenance');

CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  serial_number VARCHAR(50) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'iPhone',
  price_3h NUMERIC(15,2) NOT NULL DEFAULT 0,
  price_6h NUMERIC(15,2) NOT NULL DEFAULT 0,
  price_12h NUMERIC(15,2) NOT NULL DEFAULT 0,
  price_24h NUMERIC(15,2) NOT NULL DEFAULT 0,
  daily_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  color VARCHAR(50) NOT NULL DEFAULT '',
  status item_status DEFAULT 'available',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Transactions
CREATE TYPE tx_status AS ENUM ('active', 'completed', 'late');

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  start_date TIMESTAMPTZ NOT NULL,
  duration_hours INT NOT NULL DEFAULT 0,
  total_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  voucher_code VARCHAR(50) DEFAULT NULL,
  actual_return_date TIMESTAMPTZ DEFAULT NULL,
  status tx_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Row Level Security via Supabase
-- If you want to require authentication strictly:
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read/write for authenticated users only" ON customers FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable read/write for authenticated users only" ON items FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable read/write for authenticated users only" ON transactions FOR ALL TO authenticated USING (true);

-- 5. Tabel Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write for authenticated users only" ON categories FOR ALL TO authenticated USING (true);
