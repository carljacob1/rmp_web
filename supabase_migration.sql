-- Supabase Database Migration Script
-- This script creates all tables matching the local IndexedDB structure
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    businessid TEXT,
    ownername TEXT,
    email TEXT,
    mobile TEXT,
    createdat TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REGISTRATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS registrations (
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
-- CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    sortorder INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    createdat TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS products (
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
-- ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
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
-- MEDICINES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS medicines (
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
-- INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
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
-- EXPENSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
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
-- EMPLOYEES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
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
-- ATTENDANCE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS attendance (
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
-- APPOINTMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS appointments (
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
-- SERVICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS services (
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
-- SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    createdat TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LOCATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS locations (
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
-- SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
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
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
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
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_timestamp ON orders(timestamp);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_attendance_employeeid ON attendance(employeeid);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_appointments_datetime ON appointments(datetime);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on all tables for security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE POLICIES FOR ANONYMOUS ACCESS
-- ============================================
-- Note: Adjust these policies based on your security requirements
-- For now, allowing full access for anonymous users (you should restrict this in production)

-- Users
CREATE POLICY "Allow all operations on users" ON users
    FOR ALL USING (true) WITH CHECK (true);

-- Registrations
CREATE POLICY "Allow all operations on registrations" ON registrations
    FOR ALL USING (true) WITH CHECK (true);

-- Categories
CREATE POLICY "Allow all operations on categories" ON categories
    FOR ALL USING (true) WITH CHECK (true);

-- Products
CREATE POLICY "Allow all operations on products" ON products
    FOR ALL USING (true) WITH CHECK (true);

-- Orders
CREATE POLICY "Allow all operations on orders" ON orders
    FOR ALL USING (true) WITH CHECK (true);

-- Medicines
CREATE POLICY "Allow all operations on medicines" ON medicines
    FOR ALL USING (true) WITH CHECK (true);

-- Invoices
CREATE POLICY "Allow all operations on invoices" ON invoices
    FOR ALL USING (true) WITH CHECK (true);

-- Expenses
CREATE POLICY "Allow all operations on expenses" ON expenses
    FOR ALL USING (true) WITH CHECK (true);

-- Employees
CREATE POLICY "Allow all operations on employees" ON employees
    FOR ALL USING (true) WITH CHECK (true);

-- Attendance
CREATE POLICY "Allow all operations on attendance" ON attendance
    FOR ALL USING (true) WITH CHECK (true);

-- Appointments
CREATE POLICY "Allow all operations on appointments" ON appointments
    FOR ALL USING (true) WITH CHECK (true);

-- Services
CREATE POLICY "Allow all operations on services" ON services
    FOR ALL USING (true) WITH CHECK (true);

-- Settings
CREATE POLICY "Allow all operations on settings" ON settings
    FOR ALL USING (true) WITH CHECK (true);

-- Locations
CREATE POLICY "Allow all operations on locations" ON locations
    FOR ALL USING (true) WITH CHECK (true);

-- Subscriptions
CREATE POLICY "Allow all operations on subscriptions" ON subscriptions
    FOR ALL USING (true) WITH CHECK (true);

-- Payments
CREATE POLICY "Allow all operations on payments" ON payments
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- ENABLE REAL-TIME FOR ALL TABLES
-- ============================================
-- Note: Real-time replication is automatically enabled for tables in the 'public' schema
-- If you need to manually enable it, run these commands in Supabase SQL Editor:
-- ALTER PUBLICATION supabase_realtime ADD TABLE users;
-- ALTER PUBLICATION supabase_realtime ADD TABLE registrations;
-- ALTER PUBLICATION supabase_realtime ADD TABLE categories;
-- ALTER PUBLICATION supabase_realtime ADD TABLE products;
-- ALTER PUBLICATION supabase_realtime ADD TABLE orders;
-- ALTER PUBLICATION supabase_realtime ADD TABLE medicines;
-- ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
-- ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
-- ALTER PUBLICATION supabase_realtime ADD TABLE employees;
-- ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
-- ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
-- ALTER PUBLICATION supabase_realtime ADD TABLE services;
-- ALTER PUBLICATION supabase_realtime ADD TABLE settings;
-- ALTER PUBLICATION supabase_realtime ADD TABLE locations;
-- ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE payments;

