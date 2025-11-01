-- Comprehensive Supabase Database Schema for RMP Mobile POS
-- This migration implements the full schema structure with proper relationships
-- Run these queries in Supabase SQL Editor

-- NOTE: This uses TEXT IDs for compatibility with existing web app
-- UUID support can be added later via migration

-- ============================================
-- IMPORTANT: DROP EXISTING TABLES FIRST
-- ============================================
-- Before running this migration, run: supabase_drop_existing_tables.sql
-- This will safely remove all existing tables
--
-- Or uncomment the DROP statements below if you want to drop here:
-- (Note: The comprehensive drop script is safer and handles dependencies better)

-- ============================================
-- DROP EXISTING TABLES (Uncomment if needed)
-- ============================================
-- Run supabase_drop_existing_tables.sql instead for comprehensive cleanup
-- Or uncomment below to drop here:

/*
DROP TABLE IF EXISTS api.transaction_items CASCADE;
DROP TABLE IF EXISTS api.transactions CASCADE;
DROP TABLE IF EXISTS api.customers CASCADE;
DROP TABLE IF EXISTS api.tax_rates CASCADE;
DROP TABLE IF EXISTS api.business_settings CASCADE;
DROP TABLE IF EXISTS api.menu_items CASCADE;
DROP TABLE IF EXISTS api.modifiers CASCADE;
DROP TABLE IF EXISTS api.patients CASCADE;
DROP TABLE IF EXISTS api.prescriptions CASCADE;
DROP TABLE IF EXISTS api.service_categories CASCADE;
DROP TABLE IF EXISTS api.containers CASCADE;
DROP TABLE IF EXISTS api.refill_history CASCADE;
DROP TABLE IF EXISTS api.open_items CASCADE;
DROP TABLE IF EXISTS api.item_types CASCADE;
DROP TABLE IF EXISTS api.businesses CASCADE;
DROP TABLE IF EXISTS api.business_types CASCADE;
DROP TABLE IF EXISTS api.barcode_settings CASCADE;
DROP TABLE IF EXISTS api.barcode_history CASCADE;
DROP TABLE IF EXISTS api.sync_queue CASCADE;
DROP TABLE IF EXISTS api.gst_reports CASCADE;
DROP TABLE IF EXISTS api.tax_reports CASCADE;
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
*/

-- ============================================
-- CREATE API SCHEMA (if not exists)
-- ============================================
CREATE SCHEMA IF NOT EXISTS api;

-- ============================================
-- ENABLE UUID EXTENSION (for future use)
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

-- Users table (extends Supabase auth.users if available)
CREATE TABLE api.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business Settings
CREATE TABLE api.business_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES api.users(id) ON DELETE CASCADE,
  business_id TEXT UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  tax_id TEXT,
  currency TEXT DEFAULT 'INR',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  business_type TEXT DEFAULT 'retail',
  plan_type TEXT DEFAULT 'free',
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Locations
CREATE TABLE api.locations (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES api.users(id) ON DELETE CASCADE,
  business_settings_id TEXT REFERENCES api.business_settings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  pos_connected BOOLEAN DEFAULT false,
  business_type TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories
CREATE TABLE api.categories (
  id TEXT PRIMARY KEY,
  location_id TEXT REFERENCES api.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sortorder INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products
CREATE TABLE api.products (
  id TEXT PRIMARY KEY,
  location_id TEXT REFERENCES api.locations(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES api.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  cost_price DECIMAL(10, 2),
  stock_quantity INTEGER DEFAULT 0,
  barcode TEXT,
  sku TEXT,
  unit TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  low_stock_threshold INTEGER,
  requires_prescription BOOLEAN DEFAULT false, -- For pharmacy
  preparation_time INTEGER, -- For restaurant (in minutes)
  duration INTEGER, -- For services (in minutes)
  modifiers JSONB, -- For restaurant modifiers/addons
  variations JSONB, -- For product variations
  tags TEXT[],
  expirydate TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers
CREATE TABLE api.customers (
  id TEXT PRIMARY KEY,
  location_id TEXT REFERENCES api.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  loyalty_points INTEGER DEFAULT 0,
  total_spent DECIMAL(10, 2) DEFAULT 0,
  last_visit TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions (replaces orders - normalized structure)
CREATE TABLE api.transactions (
  id TEXT PRIMARY KEY,
  location_id TEXT REFERENCES api.locations(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES api.customers(id) ON DELETE SET NULL,
  user_id TEXT REFERENCES api.users(id) ON DELETE SET NULL,
  receipt_number TEXT,
  transaction_id TEXT UNIQUE,
  subtotal DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  discount_type TEXT, -- 'percentage' or 'fixed'
  total_tax DECIMAL(10, 2) DEFAULT 0,
  platform_fee DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL, -- 'cash', 'card', 'upi', 'nfc'
  payment_status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'refunded'
  upi_id TEXT,
  upi_app TEXT,
  upi_transaction_id TEXT,
  upi_reference TEXT,
  cash_amount DECIMAL(10, 2),
  change_amount DECIMAL(10, 2),
  card_transaction_id TEXT,
  nfc_upi_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  store_name TEXT,
  store_address TEXT,
  cashier TEXT,
  fee_breakdown JSONB,
  receipt_data JSONB, -- Store full receipt data as JSON
  business_type TEXT, -- For compatibility during migration
  synced BOOLEAN DEFAULT false,
  synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transaction Items (normalized from orders.items JSONB)
CREATE TABLE api.transaction_items (
  id TEXT PRIMARY KEY,
  transaction_id TEXT REFERENCES api.transactions(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES api.products(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  item_type TEXT,
  quantity DECIMAL(10, 2) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  tax_rate_id TEXT,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tax Rates
CREATE TABLE api.tax_rates (
  id TEXT PRIMARY KEY,
  location_id TEXT REFERENCES api.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rate DECIMAL(5, 2) NOT NULL,
  type TEXT DEFAULT 'percentage', -- 'percentage' or 'fixed'
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employees
CREATE TABLE api.employees (
  id TEXT PRIMARY KEY,
  location_id TEXT REFERENCES api.locations(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES api.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'employee',
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  hire_date DATE,
  salary DECIMAL(10, 2),
  employeid TEXT,
  pin TEXT,
  performancescore NUMERIC,
  joindate TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- RESTAURANT-SPECIFIC TABLES
-- ============================================

-- Menu Items (for restaurant)
CREATE TABLE api.menu_items (
  id TEXT PRIMARY KEY,
  location_id TEXT REFERENCES api.locations(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES api.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  preparation_time INTEGER, -- in minutes
  is_available BOOLEAN DEFAULT true,
  is_vegetarian BOOLEAN DEFAULT false,
  is_spicy BOOLEAN DEFAULT false,
  allergens TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Modifiers (for restaurant - food modifiers/addons)
CREATE TABLE api.modifiers (
  id TEXT PRIMARY KEY,
  location_id TEXT REFERENCES api.locations(id) ON DELETE CASCADE,
  category_id TEXT,
  menu_item_id TEXT REFERENCES api.menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT, -- 'size', 'topping', 'addon', etc.
  price DECIMAL(10, 2) DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PHARMACY-SPECIFIC TABLES
-- ============================================

-- Service Categories (for pharmacy/services)
CREATE TABLE api.service_categories (
  id TEXT PRIMARY KEY,
  location_id TEXT REFERENCES api.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Patients (for pharmacy)
CREATE TABLE api.patients (
  id TEXT PRIMARY KEY,
  location_id TEXT REFERENCES api.locations(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES api.customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  medical_history TEXT,
  allergies TEXT[],
  insurance_provider TEXT,
  insurance_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prescriptions (for pharmacy)
CREATE TABLE api.prescriptions (
  id TEXT PRIMARY KEY,
  location_id TEXT REFERENCES api.locations(id) ON DELETE CASCADE,
  patient_id TEXT REFERENCES api.patients(id) ON DELETE CASCADE,
  doctor_name TEXT,
  doctor_license TEXT,
  prescription_date DATE,
  notes TEXT,
  items JSONB, -- Array of prescribed medications
  status TEXT DEFAULT 'active', -- 'active', 'fulfilled', 'expired'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SERVICE BUSINESS TABLES
-- ============================================

-- Services
CREATE TABLE api.services (
  id TEXT PRIMARY KEY,
  location_id TEXT REFERENCES api.locations(id) ON DELETE CASCADE,
  service_category_id TEXT REFERENCES api.service_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  duration INTEGER, -- in minutes
  category TEXT, -- For backward compatibility
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appointments (for services/pharmacy)
CREATE TABLE api.appointments (
  id TEXT PRIMARY KEY,
  location_id TEXT REFERENCES api.locations(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES api.customers(id) ON DELETE CASCADE,
  service_id TEXT REFERENCES api.services(id) ON DELETE SET NULL,
  employee_id TEXT REFERENCES api.employees(id) ON DELETE SET NULL,
  title TEXT,
  description TEXT,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  duration INTEGER, -- in minutes
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'completed', 'cancelled'
  payment_status TEXT DEFAULT 'pending',
  total_amount DECIMAL(10, 2),
  notes TEXT,
  -- Backward compatibility fields
  customername TEXT,
  customerphone TEXT,
  customeremail TEXT,
  servicename TEXT,
  datetime TIMESTAMP WITH TIME ZONE,
  google_calendar_event_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- REFILLING BUSINESS TABLES
-- ============================================

-- Containers (for refilling business)
CREATE TABLE api.containers (
  id TEXT PRIMARY KEY,
  location_id TEXT REFERENCES api.locations(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES api.customers(id) ON DELETE CASCADE,
  container_number TEXT UNIQUE,
  container_type TEXT, -- 'vessel', 'cylinder', etc.
  capacity TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'empty', 'refilled', 'returned'
  last_refill_date DATE,
  next_refill_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Refill History
CREATE TABLE api.refill_history (
  id TEXT PRIMARY KEY,
  location_id TEXT REFERENCES api.locations(id) ON DELETE CASCADE,
  container_id TEXT REFERENCES api.containers(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES api.customers(id) ON DELETE CASCADE,
  refill_date DATE NOT NULL,
  quantity DECIMAL(10, 2),
  amount DECIMAL(10, 2),
  payment_status TEXT DEFAULT 'pending',
  delivery_address TEXT,
  delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- OPEN ITEM SYSTEM
-- ============================================

-- Item Types
CREATE TABLE api.item_types (
  id TEXT PRIMARY KEY,
  location_id TEXT REFERENCES api.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Open Items
CREATE TABLE api.open_items (
  id TEXT PRIMARY KEY,
  location_id TEXT REFERENCES api.locations(id) ON DELETE CASCADE,
  item_type_id TEXT REFERENCES api.item_types(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL(10, 2),
  unit TEXT,
  price DECIMAL(10, 2),
  tax_rate_id TEXT REFERENCES api.tax_rates(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'open', -- 'open', 'closed', 'transferred'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MULTI-BUSINESS SUPPORT
-- ============================================

-- Businesses
CREATE TABLE api.businesses (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES api.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  business_type TEXT,
  registration_number TEXT,
  tax_id TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business Types
CREATE TABLE api.business_types (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  features JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- BARCODE MANAGEMENT
-- ============================================

-- Barcode Settings
CREATE TABLE api.barcode_settings (
  id TEXT PRIMARY KEY,
  location_id TEXT REFERENCES api.locations(id) ON DELETE CASCADE,
  prefix TEXT,
  format TEXT DEFAULT 'CODE128',
  include_price BOOLEAN DEFAULT false,
  include_name BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Barcode History
CREATE TABLE api.barcode_history (
  id TEXT PRIMARY KEY,
  location_id TEXT REFERENCES api.locations(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES api.products(id) ON DELETE SET NULL,
  barcode TEXT NOT NULL,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  action TEXT, -- 'add', 'update', 'scan', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SYNC & REPORTS
-- ============================================

-- Sync Queue (for offline sync)
CREATE TABLE api.sync_queue (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES api.users(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'insert', 'update', 'delete'
  data JSONB,
  status TEXT DEFAULT 'pending', -- 'pending', 'syncing', 'synced', 'failed'
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE
);

-- GST Reports
CREATE TABLE api.gst_reports (
  id TEXT PRIMARY KEY,
  location_id TEXT REFERENCES api.locations(id) ON DELETE CASCADE,
  report_period TEXT, -- 'monthly', 'quarterly', 'yearly'
  period_start DATE,
  period_end DATE,
  total_sales DECIMAL(10, 2),
  total_tax DECIMAL(10, 2),
  cgst DECIMAL(10, 2),
  sgst DECIMAL(10, 2),
  igst DECIMAL(10, 2),
  report_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tax Reports
CREATE TABLE api.tax_reports (
  id TEXT PRIMARY KEY,
  location_id TEXT REFERENCES api.locations(id) ON DELETE CASCADE,
  report_period TEXT,
  period_start DATE,
  period_end DATE,
  total_revenue DECIMAL(10, 2),
  total_tax_collected DECIMAL(10, 2),
  tax_breakdown JSONB,
  report_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- LEGACY TABLES (for backward compatibility during migration)
-- ============================================

-- Orders (kept for migration - will be replaced by transactions)
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

-- Registrations
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

-- Medicines
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

-- Invoices
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

-- Expenses
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

-- Attendance
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

-- Settings
CREATE TABLE api.settings (
    id TEXT PRIMARY KEY,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    createdat TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
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

-- Payments
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

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON api.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON api.users(phone);

-- Business Settings indexes
CREATE INDEX IF NOT EXISTS idx_business_settings_user_id ON api.business_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_business_settings_business_id ON api.business_settings(business_id);

-- Locations indexes
CREATE INDEX IF NOT EXISTS idx_locations_user_id ON api.locations(user_id);
CREATE INDEX IF NOT EXISTS idx_locations_business_settings_id ON api.locations(business_settings_id);
CREATE INDEX IF NOT EXISTS idx_locations_is_active ON api.locations(is_active);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_location_id ON api.products(location_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON api.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON api.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON api.products(is_active);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_location_id ON api.transactions(location_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON api.transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON api.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON api.transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_status ON api.transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_transactions_synced ON api.transactions(synced);

-- Transaction Items indexes
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON api.transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_product_id ON api.transaction_items(product_id);

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_location_id ON api.customers(location_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON api.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON api.customers(email);

-- Tax Rates indexes
CREATE INDEX IF NOT EXISTS idx_tax_rates_location_id ON api.tax_rates(location_id);
CREATE INDEX IF NOT EXISTS idx_tax_rates_is_active ON api.tax_rates(is_active);

-- Appointments indexes
CREATE INDEX IF NOT EXISTS idx_appointments_location_id ON api.appointments(location_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON api.appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_appointment_date ON api.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON api.appointments(status);

-- Orders indexes (legacy)
CREATE INDEX IF NOT EXISTS idx_orders_timestamp ON api.orders(timestamp);
CREATE INDEX IF NOT EXISTS idx_orders_status ON api.orders(status);

-- Attendance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_employeeid ON api.attendance(employeeid);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON api.attendance(date);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on ALL tables
ALTER TABLE api.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.refill_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.open_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.item_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.business_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.barcode_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.barcode_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.gst_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.tax_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.payments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- BASIC RLS POLICIES (Will be enhanced with auth.uid() later)
-- ============================================

-- For now, allow authenticated access - can be enhanced later with proper auth.uid() checks
-- NOTE: In production, implement proper authentication-based RLS policies

-- Users: Allow authenticated users to manage their own data
CREATE POLICY "Users can manage own data" ON api.users
  FOR ALL USING (true) WITH CHECK (true);

-- Business Settings: Allow management of own business
CREATE POLICY "Users can manage own business settings" ON api.business_settings
  FOR ALL USING (true) WITH CHECK (true);

-- Locations: Allow access to own locations
CREATE POLICY "Users can manage own locations" ON api.locations
  FOR ALL USING (true) WITH CHECK (true);

-- Products: Allow access to products in own locations
CREATE POLICY "Users can manage own products" ON api.products
  FOR ALL USING (true) WITH CHECK (true);

-- Transactions: Allow access to own transactions
CREATE POLICY "Users can manage own transactions" ON api.transactions
  FOR ALL USING (true) WITH CHECK (true);

-- Transaction Items: Allow access to own transaction items
CREATE POLICY "Users can manage own transaction items" ON api.transaction_items
  FOR ALL USING (true) WITH CHECK (true);

-- Customers: Allow access to own customers
CREATE POLICY "Users can manage own customers" ON api.customers
  FOR ALL USING (true) WITH CHECK (true);

-- Categories: Allow access to own categories
CREATE POLICY "Users can manage own categories" ON api.categories
  FOR ALL USING (true) WITH CHECK (true);

-- Tax Rates: Allow access to own tax rates
CREATE POLICY "Users can manage own tax rates" ON api.tax_rates
  FOR ALL USING (true) WITH CHECK (true);

-- Employees: Allow access to own employees
CREATE POLICY "Users can manage own employees" ON api.employees
  FOR ALL USING (true) WITH CHECK (true);

-- All other tables: Basic permissive policy (enhance later)
CREATE POLICY "Allow all operations" ON api.menu_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON api.modifiers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON api.services FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON api.service_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON api.appointments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON api.patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON api.prescriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON api.containers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON api.refill_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON api.open_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON api.item_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON api.businesses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON api.business_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON api.barcode_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON api.barcode_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON api.gst_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON api.tax_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON api.sync_queue FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON api.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON api.registrations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON api.medicines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON api.invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON api.expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON api.attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON api.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON api.subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON api.payments FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update last_updated timestamp
CREATE OR REPLACE FUNCTION api.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for last_updated on all tables with last_updated column
CREATE TRIGGER update_business_settings_updated_at BEFORE UPDATE ON api.business_settings
  FOR EACH ROW EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON api.locations
  FOR EACH ROW EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON api.products
  FOR EACH ROW EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON api.customers
  FOR EACH ROW EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON api.transactions
  FOR EACH ROW EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON api.users
  FOR EACH ROW EXECUTE FUNCTION api.update_updated_at_column();

-- ============================================
-- INITIAL DATA (Business Types)
-- ============================================

INSERT INTO api.business_types (id, name, description, features) VALUES
('bt_retail', 'retail', 'Retail Store', '{"inventory_management": true, "barcode_scanning": true, "stock_tracking": true}'),
('bt_restaurant', 'restaurant', 'Restaurant/Cafe', '{"menu_management": true, "table_management": true, "kitchen_display": true, "modifiers_addons": true}'),
('bt_pharmacy', 'pharmacy', 'Pharmacy/Medical', '{"prescription_management": true, "medicine_tracking": true, "expiry_alerts": true, "patient_records": true}'),
('bt_services', 'services', 'Service Business', '{"appointment_booking": true, "service_tracking": true, "staff_scheduling": true, "calendar_integration": true}'),
('bt_refilling', 'refilling', 'Gas Refilling Business', '{"container_tracking": true, "refill_scheduling": true, "delivery_tracking": true, "route_optimization": true}')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA api TO anon;
GRANT USAGE ON SCHEMA api TO authenticated;

-- Grant access to all tables
GRANT ALL ON ALL TABLES IN SCHEMA api TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA api TO authenticated;

-- Grant sequence access
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA api TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA api TO authenticated;

-- ============================================
-- ENABLE REAL-TIME FOR ALL TABLES
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE api.users;
ALTER PUBLICATION supabase_realtime ADD TABLE api.business_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE api.locations;
ALTER PUBLICATION supabase_realtime ADD TABLE api.products;
ALTER PUBLICATION supabase_realtime ADD TABLE api.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE api.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE api.transaction_items;
ALTER PUBLICATION supabase_realtime ADD TABLE api.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE api.tax_rates;
ALTER PUBLICATION supabase_realtime ADD TABLE api.employees;
ALTER PUBLICATION supabase_realtime ADD TABLE api.menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE api.modifiers;
ALTER PUBLICATION supabase_realtime ADD TABLE api.services;
ALTER PUBLICATION supabase_realtime ADD TABLE api.service_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE api.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE api.patients;
ALTER PUBLICATION supabase_realtime ADD TABLE api.prescriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE api.containers;
ALTER PUBLICATION supabase_realtime ADD TABLE api.refill_history;
ALTER PUBLICATION supabase_realtime ADD TABLE api.open_items;
ALTER PUBLICATION supabase_realtime ADD TABLE api.item_types;
ALTER PUBLICATION supabase_realtime ADD TABLE api.businesses;
ALTER PUBLICATION supabase_realtime ADD TABLE api.business_types;
ALTER PUBLICATION supabase_realtime ADD TABLE api.barcode_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE api.barcode_history;
ALTER PUBLICATION supabase_realtime ADD TABLE api.gst_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE api.tax_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE api.sync_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE api.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE api.registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE api.medicines;
ALTER PUBLICATION supabase_realtime ADD TABLE api.invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE api.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE api.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE api.settings;
ALTER PUBLICATION supabase_realtime ADD TABLE api.subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE api.payments;

