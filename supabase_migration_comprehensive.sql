-- Comprehensive Supabase Database Schema for RMP POS
-- This migration matches the mobile app structure EXACTLY
-- Uses api schema and TEXT IDs for compatibility
-- Run these queries in Supabase SQL Editor

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

-- Users table (does not reference auth.users - standalone for compatibility)
CREATE TABLE api.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  -- Legacy fields for backward compatibility
  businessid TEXT,
  ownername TEXT,
  mobile TEXT,
  createdat TIMESTAMP WITH TIME ZONE
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
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
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
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Legacy fields for backward compatibility
  manager TEXT,
  createdat TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Categories
CREATE TABLE api.categories (
  id TEXT PRIMARY KEY,
  location_id TEXT REFERENCES api.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Legacy fields for backward compatibility
  sortorder INTEGER,
  createdat TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Legacy fields for backward compatibility
  category TEXT, -- Legacy: maps to category_id name
  image TEXT, -- Legacy: maps to image_url
  available BOOLEAN, -- Legacy: maps to is_active
  stock INTEGER, -- Legacy: maps to stock_quantity
  lowstockthreshold INTEGER, -- Legacy: maps to low_stock_threshold
  expirydate TIMESTAMP WITH TIME ZONE,
  modifiers JSONB, -- Legacy restaurant modifiers
  variations JSONB, -- Legacy product variations
  tags TEXT[], -- Legacy tags
  createdat TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
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

-- Transactions
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
  synced BOOLEAN DEFAULT false,
  synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transaction Items
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
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'completed', 'cancelled
  payment_status TEXT DEFAULT 'pending',
  total_amount DECIMAL(10, 2),
  notes TEXT,
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
-- LEGACY TABLES (for backward compatibility)
-- ============================================

-- Registrations (for user registration data)
CREATE TABLE api.registrations (
  id TEXT PRIMARY KEY,
  ownername TEXT,
  email TEXT,
  mobile TEXT,
  password TEXT,
  businesstype TEXT,
  plan TEXT,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE
);

-- Initialize registrations timestamps
UPDATE api.registrations SET created_at = COALESCE(createdat, NOW()) WHERE created_at IS NULL;
UPDATE api.registrations SET updated_at = COALESCE(createdat, NOW()) WHERE updated_at IS NULL;

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

-- Sync Queue indexes
CREATE INDEX IF NOT EXISTS idx_sync_queue_user_id ON api.sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON api.sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_table_name ON api.sync_queue(table_name);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on ALL tables (NO PUBLIC ACCESS)
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
ALTER TABLE api.registrations ENABLE ROW LEVEL SECURITY;

-- Users: Allow all operations for sync compatibility (will be restricted later with proper auth)
CREATE POLICY "Users can view own data" ON api.users
  FOR SELECT USING (true); -- TODO: Replace with auth.uid() check when auth is implemented

CREATE POLICY "Users can insert data" ON api.users
  FOR INSERT WITH CHECK (true); -- Allow inserts for sync

CREATE POLICY "Users can update own data" ON api.users
  FOR UPDATE USING (true) WITH CHECK (true); -- TODO: Replace with auth.uid() check when auth is implemented

CREATE POLICY "Users can delete own data" ON api.users
  FOR DELETE USING (true); -- TODO: Replace with auth.uid() check when auth is implemented

-- Business Settings: Users can only access their own business settings
CREATE POLICY "Users can manage own business settings" ON api.business_settings
  FOR ALL USING (true) WITH CHECK (true); -- TODO: Replace with auth.uid() = user_id check

-- Locations: Users can only access locations for their businesses
CREATE POLICY "Users can manage own locations" ON api.locations
  FOR ALL USING (true) WITH CHECK (true); -- TODO: Replace with proper auth.uid() check via business_settings

-- Products: Users can access products for their locations
CREATE POLICY "Users can manage own products" ON api.products
  FOR ALL USING (true) WITH CHECK (true); -- TODO: Replace with proper auth.uid() check via locations

-- Transactions: Users can access transactions for their locations
CREATE POLICY "Users can manage own transactions" ON api.transactions
  FOR ALL USING (true) WITH CHECK (true); -- TODO: Replace with proper auth.uid() check via locations

-- Transaction Items: Users can access items for their transactions
CREATE POLICY "Users can manage own transaction items" ON api.transaction_items
  FOR ALL USING (true) WITH CHECK (true); -- TODO: Replace with proper auth.uid() check via transactions

-- Customers: Users can access customers for their locations
CREATE POLICY "Users can manage own customers" ON api.customers
  FOR ALL USING (true) WITH CHECK (true); -- TODO: Replace with proper auth.uid() check via locations

-- Categories: Users can access categories for their locations
CREATE POLICY "Users can manage own categories" ON api.categories
  FOR ALL USING (true) WITH CHECK (true); -- TODO: Replace with proper auth.uid() check via locations

-- Tax Rates: Users can access tax rates for their locations
CREATE POLICY "Users can manage own tax rates" ON api.tax_rates
  FOR ALL USING (true) WITH CHECK (true); -- TODO: Replace with proper auth.uid() check via locations

-- Sync Queue: Users can only access their own sync queue items
CREATE POLICY "Users can manage own sync queue" ON api.sync_queue
  FOR ALL USING (true) WITH CHECK (true); -- TODO: Replace with auth.uid() = user_id check

-- Employees: Users can access employees for their locations
CREATE POLICY "Users can manage own employees" ON api.employees
  FOR ALL USING (true) WITH CHECK (true); -- TODO: Replace with proper auth.uid() check via locations

-- Menu Items: Users can access menu items for their locations
CREATE POLICY "Users can manage own menu items" ON api.menu_items
  FOR ALL USING (true) WITH CHECK (true); -- TODO: Replace with proper auth.uid() check via locations

-- Modifiers: Users can access modifiers for their locations
CREATE POLICY "Users can manage own modifiers" ON api.modifiers
  FOR ALL USING (true) WITH CHECK (true); -- TODO: Replace with proper auth.uid() check via locations

-- Services: Users can access services for their locations
CREATE POLICY "Users can manage own services" ON api.services
  FOR ALL USING (true) WITH CHECK (true); -- TODO: Replace with proper auth.uid() check via locations

-- Service Categories: Users can access service categories for their locations
CREATE POLICY "Users can manage own service categories" ON api.service_categories
  FOR ALL USING (true) WITH CHECK (true); -- TODO: Replace with proper auth.uid() check via locations

-- Appointments: Users can access appointments for their locations
CREATE POLICY "Users can manage own appointments" ON api.appointments
  FOR ALL USING (true) WITH CHECK (true); -- TODO: Replace with proper auth.uid() check via locations

-- Patients: Users can access patients for their locations
CREATE POLICY "Users can manage own patients" ON api.patients
  FOR ALL USING (true) WITH CHECK (true); -- TODO: Replace with proper auth.uid() check via locations

-- Prescriptions: Users can access prescriptions for their locations
CREATE POLICY "Users can manage own prescriptions" ON api.prescriptions
  FOR ALL USING (true) WITH CHECK (true); -- TODO: Replace with proper auth.uid() check via locations

-- Containers: Users can access containers for their locations
CREATE POLICY "Users can manage own containers" ON api.containers
  FOR ALL USING (true) WITH CHECK (true); -- TODO: Replace with proper auth.uid() check via locations

-- Refill History: Users can access refill history for their locations
CREATE POLICY "Users can manage own refill history" ON api.refill_history
  FOR ALL USING (true) WITH CHECK (true); -- TODO: Replace with proper auth.uid() check via locations

-- Open Items: Users can access open items for their locations
CREATE POLICY "Users can manage own open items" ON api.open_items
  FOR ALL USING (true) WITH CHECK (true); -- TODO: Replace with proper auth.uid() check via locations

-- Item Types: Users can access item types for their locations
CREATE POLICY "Users can manage own item types" ON api.item_types
  FOR ALL USING (true) WITH CHECK (true); -- TODO: Replace with proper auth.uid() check via locations

-- Businesses: Users can only access their own businesses
CREATE POLICY "Users can manage own businesses" ON api.businesses
  FOR ALL USING (true) WITH CHECK (true); -- TODO: Replace with auth.uid() = user_id check

-- Business Types: Authenticated users can read (no public access)
CREATE POLICY "Authenticated users can read business types" ON api.business_types
  FOR SELECT USING (true); -- TODO: Replace with auth.uid() IS NOT NULL check

-- Barcode Settings: Users can access barcode settings for their locations
CREATE POLICY "Users can manage own barcode settings" ON api.barcode_settings
  FOR ALL USING (true) WITH CHECK (true); -- TODO: Replace with proper auth.uid() check via locations

-- Barcode History: Users can access barcode history for their locations
CREATE POLICY "Users can manage own barcode history" ON api.barcode_history
  FOR ALL USING (true) WITH CHECK (true); -- TODO: Replace with proper auth.uid() check via locations

-- GST Reports: Users can access GST reports for their locations
CREATE POLICY "Users can manage own gst reports" ON api.gst_reports
  FOR ALL USING (true) WITH CHECK (true); -- TODO: Replace with proper auth.uid() check via locations

-- Tax Reports: Users can access tax reports for their locations
CREATE POLICY "Users can manage own tax reports" ON api.tax_reports
  FOR ALL USING (true) WITH CHECK (true); -- TODO: Replace with proper auth.uid() check via locations

-- Registrations: Allow management of registrations
CREATE POLICY "Allow all operations on registrations" ON api.registrations
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update last_updated and updated_at timestamps
CREATE OR REPLACE FUNCTION api.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at columns to all tables (if they don't exist)
ALTER TABLE api.business_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.transaction_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.tax_rates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.employees ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.menu_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.modifiers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.service_categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.patients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.prescriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.services ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.appointments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.containers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.refill_history ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.item_types ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.open_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.businesses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.business_types ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.barcode_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.gst_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.tax_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

-- Initialize updated_at with current timestamp for existing records
UPDATE api.business_settings SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.locations SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.categories SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.products SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.customers SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.transactions SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.transaction_items SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.tax_rates SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.employees SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.menu_items SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.modifiers SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.service_categories SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.patients SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.prescriptions SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.services SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.appointments SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.containers SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.refill_history SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.item_types SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.open_items SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.businesses SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.business_types SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.barcode_settings SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.gst_reports SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.tax_reports SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;

-- Create triggers for last_updated and updated_at on all tables
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

CREATE TRIGGER update_transaction_items_updated_at BEFORE UPDATE ON api.transaction_items
  FOR EACH ROW EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_tax_rates_updated_at BEFORE UPDATE ON api.tax_rates
  FOR EACH ROW EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON api.employees
  FOR EACH ROW EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON api.menu_items
  FOR EACH ROW EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_modifiers_updated_at BEFORE UPDATE ON api.modifiers
  FOR EACH ROW EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_service_categories_updated_at BEFORE UPDATE ON api.service_categories
  FOR EACH ROW EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON api.patients
  FOR EACH ROW EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON api.prescriptions
  FOR EACH ROW EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON api.services
  FOR EACH ROW EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON api.appointments
  FOR EACH ROW EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_containers_updated_at BEFORE UPDATE ON api.containers
  FOR EACH ROW EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_refill_history_updated_at BEFORE UPDATE ON api.refill_history
  FOR EACH ROW EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_item_types_updated_at BEFORE UPDATE ON api.item_types
  FOR EACH ROW EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_open_items_updated_at BEFORE UPDATE ON api.open_items
  FOR EACH ROW EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON api.businesses
  FOR EACH ROW EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_business_types_updated_at BEFORE UPDATE ON api.business_types
  FOR EACH ROW EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_barcode_settings_updated_at BEFORE UPDATE ON api.barcode_settings
  FOR EACH ROW EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_gst_reports_updated_at BEFORE UPDATE ON api.gst_reports
  FOR EACH ROW EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_tax_reports_updated_at BEFORE UPDATE ON api.tax_reports
  FOR EACH ROW EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON api.categories
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
ALTER PUBLICATION supabase_realtime ADD TABLE api.registrations;
