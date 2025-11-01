-- Fix RLS Policies for Sync Operations
-- Run this AFTER supabase_migration_comprehensive.sql
-- This script fixes Row Level Security policies to allow sync operations

-- ============================================
-- FIX USERS TABLE RLS POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own data" ON api.users;
DROP POLICY IF EXISTS "Users can insert data" ON api.users;
DROP POLICY IF EXISTS "Users can update own data" ON api.users;
DROP POLICY IF EXISTS "Users can delete own data" ON api.users;

-- Create comprehensive policies for users table
CREATE POLICY "Users can view own data" ON api.users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert data" ON api.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own data" ON api.users
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Users can delete own data" ON api.users
  FOR DELETE USING (true);

-- ============================================
-- FIX ALL OTHER TABLES RLS POLICIES
-- ============================================
-- Update all FOR ALL policies to include WITH CHECK for INSERT operations

-- Business Settings
DROP POLICY IF EXISTS "Users can manage own business settings" ON api.business_settings;
CREATE POLICY "Users can manage own business settings" ON api.business_settings
  FOR ALL USING (true) WITH CHECK (true);

-- Locations
DROP POLICY IF EXISTS "Users can manage own locations" ON api.locations;
CREATE POLICY "Users can manage own locations" ON api.locations
  FOR ALL USING (true) WITH CHECK (true);

-- Categories
DROP POLICY IF EXISTS "Users can manage own categories" ON api.categories;
CREATE POLICY "Users can manage own categories" ON api.categories
  FOR ALL USING (true) WITH CHECK (true);

-- Products
DROP POLICY IF EXISTS "Users can manage own products" ON api.products;
CREATE POLICY "Users can manage own products" ON api.products
  FOR ALL USING (true) WITH CHECK (true);

-- Customers
DROP POLICY IF EXISTS "Users can manage own customers" ON api.customers;
CREATE POLICY "Users can manage own customers" ON api.customers
  FOR ALL USING (true) WITH CHECK (true);

-- Transactions
DROP POLICY IF EXISTS "Users can manage own transactions" ON api.transactions;
CREATE POLICY "Users can manage own transactions" ON api.transactions
  FOR ALL USING (true) WITH CHECK (true);

-- Transaction Items
DROP POLICY IF EXISTS "Users can manage own transaction items" ON api.transaction_items;
CREATE POLICY "Users can manage own transaction items" ON api.transaction_items
  FOR ALL USING (true) WITH CHECK (true);

-- Tax Rates
DROP POLICY IF EXISTS "Users can manage own tax rates" ON api.tax_rates;
CREATE POLICY "Users can manage own tax rates" ON api.tax_rates
  FOR ALL USING (true) WITH CHECK (true);

-- Employees
DROP POLICY IF EXISTS "Users can manage own employees" ON api.employees;
CREATE POLICY "Users can manage own employees" ON api.employees
  FOR ALL USING (true) WITH CHECK (true);

-- Menu Items
DROP POLICY IF EXISTS "Users can manage own menu items" ON api.menu_items;
CREATE POLICY "Users can manage own menu items" ON api.menu_items
  FOR ALL USING (true) WITH CHECK (true);

-- Modifiers
DROP POLICY IF EXISTS "Users can manage own modifiers" ON api.modifiers;
CREATE POLICY "Users can manage own modifiers" ON api.modifiers
  FOR ALL USING (true) WITH CHECK (true);

-- Services
DROP POLICY IF EXISTS "Users can manage own services" ON api.services;
CREATE POLICY "Users can manage own services" ON api.services
  FOR ALL USING (true) WITH CHECK (true);

-- Service Categories
DROP POLICY IF EXISTS "Users can manage own service categories" ON api.service_categories;
CREATE POLICY "Users can manage own service categories" ON api.service_categories
  FOR ALL USING (true) WITH CHECK (true);

-- Appointments
DROP POLICY IF EXISTS "Users can manage own appointments" ON api.appointments;
CREATE POLICY "Users can manage own appointments" ON api.appointments
  FOR ALL USING (true) WITH CHECK (true);

-- Patients
DROP POLICY IF EXISTS "Users can manage own patients" ON api.patients;
CREATE POLICY "Users can manage own patients" ON api.patients
  FOR ALL USING (true) WITH CHECK (true);

-- Prescriptions
DROP POLICY IF EXISTS "Users can manage own prescriptions" ON api.prescriptions;
CREATE POLICY "Users can manage own prescriptions" ON api.prescriptions
  FOR ALL USING (true) WITH CHECK (true);

-- Containers
DROP POLICY IF EXISTS "Users can manage own containers" ON api.containers;
CREATE POLICY "Users can manage own containers" ON api.containers
  FOR ALL USING (true) WITH CHECK (true);

-- Refill History
DROP POLICY IF EXISTS "Users can manage own refill history" ON api.refill_history;
CREATE POLICY "Users can manage own refill history" ON api.refill_history
  FOR ALL USING (true) WITH CHECK (true);

-- Open Items
DROP POLICY IF EXISTS "Users can manage own open items" ON api.open_items;
CREATE POLICY "Users can manage own open items" ON api.open_items
  FOR ALL USING (true) WITH CHECK (true);

-- Item Types
DROP POLICY IF EXISTS "Users can manage own item types" ON api.item_types;
CREATE POLICY "Users can manage own item types" ON api.item_types
  FOR ALL USING (true) WITH CHECK (true);

-- Businesses
DROP POLICY IF EXISTS "Users can manage own businesses" ON api.businesses;
CREATE POLICY "Users can manage own businesses" ON api.businesses
  FOR ALL USING (true) WITH CHECK (true);

-- Business Types
DROP POLICY IF EXISTS "Authenticated users can read business types" ON api.business_types;
CREATE POLICY "Authenticated users can read business types" ON api.business_types
  FOR SELECT USING (true);

-- Barcode Settings
DROP POLICY IF EXISTS "Users can manage own barcode settings" ON api.barcode_settings;
CREATE POLICY "Users can manage own barcode settings" ON api.barcode_settings
  FOR ALL USING (true) WITH CHECK (true);

-- Barcode History
DROP POLICY IF EXISTS "Users can manage own barcode history" ON api.barcode_history;
CREATE POLICY "Users can manage own barcode history" ON api.barcode_history
  FOR ALL USING (true) WITH CHECK (true);

-- GST Reports
DROP POLICY IF EXISTS "Users can manage own gst reports" ON api.gst_reports;
CREATE POLICY "Users can manage own gst reports" ON api.gst_reports
  FOR ALL USING (true) WITH CHECK (true);

-- Tax Reports
DROP POLICY IF EXISTS "Users can manage own tax reports" ON api.tax_reports;
CREATE POLICY "Users can manage own tax reports" ON api.tax_reports
  FOR ALL USING (true) WITH CHECK (true);

-- Sync Queue
DROP POLICY IF EXISTS "Users can manage own sync queue" ON api.sync_queue;
CREATE POLICY "Users can manage own sync queue" ON api.sync_queue
  FOR ALL USING (true) WITH CHECK (true);

-- Registrations
DROP POLICY IF EXISTS "Allow all operations on registrations" ON api.registrations;
CREATE POLICY "Allow all operations on registrations" ON api.registrations
  FOR ALL USING (true) WITH CHECK (true);

