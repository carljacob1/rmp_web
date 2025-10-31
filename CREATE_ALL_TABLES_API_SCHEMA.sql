-- =====================================================
-- CREATE ALL TABLES IN 'api' SCHEMA
-- Matches your local IndexedDB structure exactly
-- Run this in Supabase SQL Editor
-- =====================================================

-- Create api schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS api;

-- Enable UUID extension (for generating IDs if needed, but we use TEXT ids)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION api.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Table: api.categories
-- =====================================================
CREATE TABLE IF NOT EXISTS api.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sortorder INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  createdat TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS categories_set_updated_at ON api.categories;
CREATE TRIGGER categories_set_updated_at 
  BEFORE UPDATE ON api.categories 
  FOR EACH ROW 
  EXECUTE FUNCTION api.set_updated_at();

ALTER TABLE api.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access for categories" ON api.categories;
CREATE POLICY "Allow all access for categories" 
  ON api.categories FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Table: api.products
-- =====================================================
CREATE TABLE IF NOT EXISTS api.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  category TEXT, -- References categories.id
  image TEXT,
  available BOOLEAN DEFAULT true,
  modifiers JSONB DEFAULT '[]'::jsonb,
  variations JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  expirydate DATE,
  stock INTEGER DEFAULT 0,
  lowstockthreshold INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  createdat TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS products_set_updated_at ON api.products;
CREATE TRIGGER products_set_updated_at 
  BEFORE UPDATE ON api.products 
  FOR EACH ROW 
  EXECUTE FUNCTION api.set_updated_at();

ALTER TABLE api.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access for products" ON api.products;
CREATE POLICY "Allow all access for products" 
  ON api.products FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Table: api.orders
-- =====================================================
CREATE TABLE IF NOT EXISTS api.orders (
  id TEXT PRIMARY KEY,
  businesstype TEXT,
  customername TEXT,
  customerphone TEXT,
  customeremail TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  taxrate NUMERIC DEFAULT 18,
  paymentmethod TEXT,
  upivid TEXT,
  paymentstatus TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'completed',
  ordertype TEXT,
  tablenumber TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  createdat TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS orders_set_updated_at ON api.orders;
CREATE TRIGGER orders_set_updated_at 
  BEFORE UPDATE ON api.orders 
  FOR EACH ROW 
  EXECUTE FUNCTION api.set_updated_at();

ALTER TABLE api.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access for orders" ON api.orders;
CREATE POLICY "Allow all access for orders" 
  ON api.orders FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Table: api.users
-- =====================================================
CREATE TABLE IF NOT EXISTS api.users (
  id TEXT PRIMARY KEY,
  businessid TEXT,
  ownername TEXT,
  email TEXT,
  mobile TEXT,
  createdat TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS users_set_updated_at ON api.users;
CREATE TRIGGER users_set_updated_at 
  BEFORE UPDATE ON api.users 
  FOR EACH ROW 
  EXECUTE FUNCTION api.set_updated_at();

ALTER TABLE api.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access for users" ON api.users;
CREATE POLICY "Allow all access for users" 
  ON api.users FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Table: api.registrations
-- =====================================================
CREATE TABLE IF NOT EXISTS api.registrations (
  id TEXT PRIMARY KEY,
  ownername TEXT,
  email TEXT,
  mobile TEXT,
  password TEXT,
  businesstype TEXT,
  plan TEXT,
  createdat TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS registrations_set_updated_at ON api.registrations;
CREATE TRIGGER registrations_set_updated_at 
  BEFORE UPDATE ON api.registrations 
  FOR EACH ROW 
  EXECUTE FUNCTION api.set_updated_at();

ALTER TABLE api.registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access for registrations" ON api.registrations;
CREATE POLICY "Allow all access for registrations" 
  ON api.registrations FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Table: api.settings
-- =====================================================
CREATE TABLE IF NOT EXISTS api.settings (
  id TEXT PRIMARY KEY,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  createdat TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS settings_set_updated_at ON api.settings;
CREATE TRIGGER settings_set_updated_at 
  BEFORE UPDATE ON api.settings 
  FOR EACH ROW 
  EXECUTE FUNCTION api.set_updated_at();

ALTER TABLE api.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access for settings" ON api.settings;
CREATE POLICY "Allow all access for settings" 
  ON api.settings FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Table: api.medicines
-- =====================================================
CREATE TABLE IF NOT EXISTS api.medicines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  batchnumber TEXT,
  expirydate DATE,
  manufacturingdate DATE,
  quantity INTEGER DEFAULT 0,
  unitprice NUMERIC DEFAULT 0,
  supplier TEXT,
  prescription BOOLEAN DEFAULT false,
  activeingredient TEXT,
  dosage TEXT,
  form TEXT CHECK (form IN ('tablet','capsule','syrup','injection','cream','drops')),
  lowstockthreshold INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  createdat TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS medicines_set_updated_at ON api.medicines;
CREATE TRIGGER medicines_set_updated_at 
  BEFORE UPDATE ON api.medicines 
  FOR EACH ROW 
  EXECUTE FUNCTION api.set_updated_at();

ALTER TABLE api.medicines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access for medicines" ON api.medicines;
CREATE POLICY "Allow all access for medicines" 
  ON api.medicines FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Table: api.invoices
-- =====================================================
CREATE TABLE IF NOT EXISTS api.invoices (
  id TEXT PRIMARY KEY,
  invoicenumber TEXT NOT NULL,
  clientname TEXT NOT NULL,
  clientemail TEXT,
  clientaddress TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  issuedate DATE NOT NULL,
  duedate DATE,
  notes TEXT,
  createdat TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS invoices_set_updated_at ON api.invoices;
CREATE TRIGGER invoices_set_updated_at 
  BEFORE UPDATE ON api.invoices 
  FOR EACH ROW 
  EXECUTE FUNCTION api.set_updated_at();

ALTER TABLE api.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access for invoices" ON api.invoices;
CREATE POLICY "Allow all access for invoices" 
  ON api.invoices FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Table: api.expenses
-- =====================================================
CREATE TABLE IF NOT EXISTS api.expenses (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  receipt TEXT,
  notes TEXT,
  createdat TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS expenses_set_updated_at ON api.expenses;
CREATE TRIGGER expenses_set_updated_at 
  BEFORE UPDATE ON api.expenses 
  FOR EACH ROW 
  EXECUTE FUNCTION api.set_updated_at();

ALTER TABLE api.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access for expenses" ON api.expenses;
CREATE POLICY "Allow all access for expenses" 
  ON api.expenses FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Table: api.appointments
-- =====================================================
CREATE TABLE IF NOT EXISTS api.appointments (
  id TEXT PRIMARY KEY,
  customername TEXT,
  customerphone TEXT,
  customeremail TEXT,
  servicename TEXT,
  serviceid TEXT,
  datetime TIMESTAMPTZ,
  duration INTEGER,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  createdat TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS appointments_set_updated_at ON api.appointments;
CREATE TRIGGER appointments_set_updated_at 
  BEFORE UPDATE ON api.appointments 
  FOR EACH ROW 
  EXECUTE FUNCTION api.set_updated_at();

ALTER TABLE api.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access for appointments" ON api.appointments;
CREATE POLICY "Allow all access for appointments" 
  ON api.appointments FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Table: api.services
-- =====================================================
CREATE TABLE IF NOT EXISTS api.services (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  price NUMERIC,
  duration INTEGER,
  category TEXT,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  createdat TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS services_set_updated_at ON api.services;
CREATE TRIGGER services_set_updated_at 
  BEFORE UPDATE ON api.services 
  FOR EACH ROW 
  EXECUTE FUNCTION api.set_updated_at();

ALTER TABLE api.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access for services" ON api.services;
CREATE POLICY "Allow all access for services" 
  ON api.services FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Table: api.employees
-- =====================================================
CREATE TABLE IF NOT EXISTS api.employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  status TEXT DEFAULT 'active',
  employeid TEXT,
  pin TEXT,
  performancescore INTEGER DEFAULT 80,
  joindate DATE,
  salary NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  createdat TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS employees_set_updated_at ON api.employees;
CREATE TRIGGER employees_set_updated_at 
  BEFORE UPDATE ON api.employees 
  FOR EACH ROW 
  EXECUTE FUNCTION api.set_updated_at();

ALTER TABLE api.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access for employees" ON api.employees;
CREATE POLICY "Allow all access for employees" 
  ON api.employees FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Table: api.attendance
-- =====================================================
CREATE TABLE IF NOT EXISTS api.attendance (
  id TEXT PRIMARY KEY,
  employeeid TEXT NOT NULL, -- References employees.id
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  checkin TIMESTAMPTZ,
  checkout TIMESTAMPTZ,
  status TEXT DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  createdat TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS attendance_set_updated_at ON api.attendance;
CREATE TRIGGER attendance_set_updated_at 
  BEFORE UPDATE ON api.attendance 
  FOR EACH ROW 
  EXECUTE FUNCTION api.set_updated_at();

ALTER TABLE api.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access for attendance" ON api.attendance;
CREATE POLICY "Allow all access for attendance" 
  ON api.attendance FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Grant permissions
-- =====================================================
GRANT USAGE ON SCHEMA api TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA api TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA api TO anon, authenticated;

-- =====================================================
-- Verify tables were created
-- =====================================================
SELECT 
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'api'
  AND tablename IN (
    'categories', 'products', 'orders', 'users', 'registrations',
    'settings', 'medicines', 'invoices', 'expenses', 'appointments',
    'services', 'employees', 'attendance'
  )
ORDER BY tablename;

