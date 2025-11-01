-- Supabase Database Migration Script - API Schema
-- This script removes all existing tables and recreates them in the 'api' schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- DROP ALL EXISTING TABLES (in both public and api schemas)
-- ============================================
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.locations CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.medicines CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.registrations CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP TABLE IF EXISTS api.payments CASCADE;
DROP TABLE IF EXISTS api.subscriptions CASCADE;
DROP TABLE IF EXISTS api.locations CASCADE;
DROP TABLE IF EXISTS api.settings CASCADE;
DROP TABLE IF EXISTS api.services CASCADE;
DROP TABLE IF EXISTS api.appointments CASCADE;
DROP TABLE IF EXISTS api.attendance CASCADE;
DROP TABLE IF EXISTS api.employees CASCADE;
DROP TABLE IF EXISTS api.expenses CASCADE;
DROP TABLE IF EXISTS api.invoices CASCADE;
DROP TABLE IF EXISTS api.medicines CASCADE;
DROP TABLE IF EXISTS api.orders CASCADE;
DROP TABLE IF EXISTS api.products CASCADE;
DROP TABLE IF EXISTS api.categories CASCADE;
DROP TABLE IF EXISTS api.registrations CASCADE;
DROP TABLE IF EXISTS api.users CASCADE;

-- ============================================
-- CREATE API SCHEMA (if not exists)
-- ============================================
CREATE SCHEMA IF NOT EXISTS api;

-- ============================================
-- ENABLE UUID EXTENSION
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE (in api schema)
-- ============================================
CREATE TABLE api.users (
    id TEXT PRIMARY KEY,
    businessid TEXT,
    ownername TEXT,
    email TEXT,
    mobile TEXT,
    createdat TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REGISTRATIONS TABLE (in api schema)
-- ============================================
CREATE TABLE api.registrations (
    id TEXT PRIMARY KEY,
    ownername TEXT,
    email TEXT,
    mobile TEXT,
    password TEXT,
    businesstype TEXT,
    plan TEXT,
    createdat TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CATEGORIES TABLE (in api schema)
-- ============================================
CREATE TABLE api.categories (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    sortorder INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    createdat TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PRODUCTS TABLE (in api schema)
-- ============================================
CREATE TABLE api.products (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    price NUMERIC,
    category TEXT,
    image TEXT,
    available BOOLEAN DEFAULT true,
    modifiers JSONB,
    variations JSONB,
    tags TEXT[],
    expirydate TIMESTAMPTZ,
    stock INTEGER DEFAULT 0,
    lowstockthreshold INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    createdat TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORDERS TABLE (in api schema)
-- ============================================
CREATE TABLE api.orders (
    id TEXT PRIMARY KEY,
    businesstype TEXT,
    customername TEXT,
    customerphone TEXT,
    customeremail TEXT,
    items JSONB,
    subtotal NUMERIC,
    tax NUMERIC,
    total NUMERIC,
    taxrate NUMERIC,
    paymentmethod TEXT,
    upivid TEXT,
    paymentstatus TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    status TEXT,
    ordertype TEXT,
    tablenumber TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    createdat TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MEDICINES TABLE (in api schema)
-- ============================================
CREATE TABLE api.medicines (
    id TEXT PRIMARY KEY,
    name TEXT,
    brand TEXT,
    category TEXT,
    batchnumber TEXT,
    expirydate TIMESTAMPTZ,
    manufacturingdate TIMESTAMPTZ,
    quantity INTEGER,
    unitprice NUMERIC,
    supplier TEXT,
    prescription BOOLEAN DEFAULT false,
    activeingredient TEXT,
    dosage TEXT,
    form TEXT,
    lowstockthreshold INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    createdat TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INVOICES TABLE (in api schema)
-- ============================================
CREATE TABLE api.invoices (
    id TEXT PRIMARY KEY,
    invoicenumber TEXT,
    clientname TEXT,
    clientemail TEXT,
    clientaddress TEXT,
    items JSONB,
    subtotal NUMERIC,
    tax NUMERIC,
    total NUMERIC,
    status TEXT,
    issuedate TIMESTAMPTZ,
    duedate TIMESTAMPTZ,
    notes TEXT,
    createdat TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EXPENSES TABLE (in api schema)
-- ============================================
CREATE TABLE api.expenses (
    id TEXT PRIMARY KEY,
    description TEXT,
    amount NUMERIC,
    category TEXT,
    date TIMESTAMPTZ,
    receipt TEXT,
    notes TEXT,
    createdat TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EMPLOYEES TABLE (in api schema)
-- ============================================
CREATE TABLE api.employees (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    phone TEXT,
    role TEXT,
    status TEXT,
    employeid TEXT,
    pin TEXT,
    performancescore NUMERIC,
    joindate TIMESTAMPTZ,
    salary NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    createdat TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ATTENDANCE TABLE (in api schema)
-- ============================================
CREATE TABLE api.attendance (
    id TEXT PRIMARY KEY,
    employeeid TEXT,
    date DATE,
    checkin TIMESTAMPTZ,
    checkout TIMESTAMPTZ,
    status TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    createdat TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- APPOINTMENTS TABLE (in api schema)
-- ============================================
CREATE TABLE api.appointments (
    id TEXT PRIMARY KEY,
    customername TEXT,
    customerphone TEXT,
    customeremail TEXT,
    servicename TEXT,
    serviceid TEXT,
    datetime TIMESTAMPTZ,
    duration INTEGER,
    status TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    createdat TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SERVICES TABLE (in api schema)
-- ============================================
CREATE TABLE api.services (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    price NUMERIC,
    duration INTEGER,
    category TEXT,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    createdat TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SETTINGS TABLE (in api schema)
-- ============================================
CREATE TABLE api.settings (
    id TEXT PRIMARY KEY,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    createdat TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LOCATIONS TABLE (in api schema)
-- ============================================
CREATE TABLE api.locations (
    id TEXT PRIMARY KEY,
    name TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    manager TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    createdat TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUBSCRIPTIONS TABLE (in api schema)
-- ============================================
CREATE TABLE api.subscriptions (
    id TEXT PRIMARY KEY,
    userid TEXT,
    plantype TEXT,
    startdate TIMESTAMPTZ,
    enddate TIMESTAMPTZ,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    createdat TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAYMENTS TABLE (in api schema)
-- ============================================
CREATE TABLE api.payments (
    id TEXT PRIMARY KEY,
    orderid TEXT,
    amount NUMERIC,
    paymentmethod TEXT,
    paymentstatus TEXT,
    transactionid TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    createdat TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON api.users(email);
CREATE INDEX IF NOT EXISTS idx_users_mobile ON api.users(mobile);
CREATE INDEX IF NOT EXISTS idx_products_category ON api.products(category);
CREATE INDEX IF NOT EXISTS idx_orders_timestamp ON api.orders(timestamp);
CREATE INDEX IF NOT EXISTS idx_orders_status ON api.orders(status);
CREATE INDEX IF NOT EXISTS idx_attendance_employeeid ON api.attendance(employeeid);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON api.attendance(date);
CREATE INDEX IF NOT EXISTS idx_appointments_datetime ON api.appointments(datetime);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON api.appointments(status);

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE api.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.payments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE POLICIES FOR ANONYMOUS ACCESS (API Schema)
-- ============================================
-- Note: Adjust these policies based on your security requirements
-- For now, allowing full access for anonymous users (you should restrict this in production)

-- Users
CREATE POLICY "Allow all operations on users" ON api.users
    FOR ALL USING (true) WITH CHECK (true);

-- Registrations
CREATE POLICY "Allow all operations on registrations" ON api.registrations
    FOR ALL USING (true) WITH CHECK (true);

-- Categories
CREATE POLICY "Allow all operations on categories" ON api.categories
    FOR ALL USING (true) WITH CHECK (true);

-- Products
CREATE POLICY "Allow all operations on products" ON api.products
    FOR ALL USING (true) WITH CHECK (true);

-- Orders
CREATE POLICY "Allow all operations on orders" ON api.orders
    FOR ALL USING (true) WITH CHECK (true);

-- Medicines
CREATE POLICY "Allow all operations on medicines" ON api.medicines
    FOR ALL USING (true) WITH CHECK (true);

-- Invoices
CREATE POLICY "Allow all operations on invoices" ON api.invoices
    FOR ALL USING (true) WITH CHECK (true);

-- Expenses
CREATE POLICY "Allow all operations on expenses" ON api.expenses
    FOR ALL USING (true) WITH CHECK (true);

-- Employees
CREATE POLICY "Allow all operations on employees" ON api.employees
    FOR ALL USING (true) WITH CHECK (true);

-- Attendance
CREATE POLICY "Allow all operations on attendance" ON api.attendance
    FOR ALL USING (true) WITH CHECK (true);

-- Appointments
CREATE POLICY "Allow all operations on appointments" ON api.appointments
    FOR ALL USING (true) WITH CHECK (true);

-- Services
CREATE POLICY "Allow all operations on services" ON api.services
    FOR ALL USING (true) WITH CHECK (true);

-- Settings
CREATE POLICY "Allow all operations on settings" ON api.settings
    FOR ALL USING (true) WITH CHECK (true);

-- Locations
CREATE POLICY "Allow all operations on locations" ON api.locations
    FOR ALL USING (true) WITH CHECK (true);

-- Subscriptions
CREATE POLICY "Allow all operations on subscriptions" ON api.subscriptions
    FOR ALL USING (true) WITH CHECK (true);

-- Payments
CREATE POLICY "Allow all operations on payments" ON api.payments
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- ENABLE REAL-TIME FOR ALL TABLES (API Schema)
-- ============================================
-- Enable real-time replication for all tables in api schema
ALTER PUBLICATION supabase_realtime ADD TABLE api.users;
ALTER PUBLICATION supabase_realtime ADD TABLE api.registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE api.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE api.products;
ALTER PUBLICATION supabase_realtime ADD TABLE api.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE api.medicines;
ALTER PUBLICATION supabase_realtime ADD TABLE api.invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE api.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE api.employees;
ALTER PUBLICATION supabase_realtime ADD TABLE api.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE api.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE api.services;
ALTER PUBLICATION supabase_realtime ADD TABLE api.settings;
ALTER PUBLICATION supabase_realtime ADD TABLE api.locations;
ALTER PUBLICATION supabase_realtime ADD TABLE api.subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE api.payments;

-- ============================================
-- GRANT API ACCESS (PostgREST)
-- ============================================
-- Grant usage on schema
GRANT USAGE ON SCHEMA api TO anon;
GRANT USAGE ON SCHEMA api TO authenticated;

-- Grant access to all tables
GRANT ALL ON api.users TO anon;
GRANT ALL ON api.registrations TO anon;
GRANT ALL ON api.categories TO anon;
GRANT ALL ON api.products TO anon;
GRANT ALL ON api.orders TO anon;
GRANT ALL ON api.medicines TO anon;
GRANT ALL ON api.invoices TO anon;
GRANT ALL ON api.expenses TO anon;
GRANT ALL ON api.employees TO anon;
GRANT ALL ON api.attendance TO anon;
GRANT ALL ON api.appointments TO anon;
GRANT ALL ON api.services TO anon;
GRANT ALL ON api.settings TO anon;
GRANT ALL ON api.locations TO anon;
GRANT ALL ON api.subscriptions TO anon;
GRANT ALL ON api.payments TO anon;

GRANT ALL ON api.users TO authenticated;
GRANT ALL ON api.registrations TO authenticated;
GRANT ALL ON api.categories TO authenticated;
GRANT ALL ON api.products TO authenticated;
GRANT ALL ON api.orders TO authenticated;
GRANT ALL ON api.medicines TO authenticated;
GRANT ALL ON api.invoices TO authenticated;
GRANT ALL ON api.expenses TO authenticated;
GRANT ALL ON api.employees TO authenticated;
GRANT ALL ON api.attendance TO authenticated;
GRANT ALL ON api.appointments TO authenticated;
GRANT ALL ON api.services TO authenticated;
GRANT ALL ON api.settings TO authenticated;
GRANT ALL ON api.locations TO authenticated;
GRANT ALL ON api.subscriptions TO authenticated;
GRANT ALL ON api.payments TO authenticated;

-- Grant sequence access (if any sequences are created)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA api TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA api TO authenticated;

-- ============================================
-- CONFIGURE POSTGREST TO EXPOSE API SCHEMA
-- ============================================
-- Note: You MUST also configure this in Supabase Dashboard:
-- Settings → API → Exposed Schemas → Add 'api'
-- OR use the SQL below if you have superuser access

-- This ensures PostgREST can access the api schema
-- The following setting needs to be configured in Supabase Dashboard:
-- Go to: Settings → API → Database Settings → Exposed Schemas
-- Add 'api' to the list of exposed schemas

-- Alternative: If you have database superuser access, you can run:
-- ALTER DATABASE postgres SET pgrst.db_schemas = 'api';
-- (Note: This requires superuser access, which is usually not available in managed Supabase)

