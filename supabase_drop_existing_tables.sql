-- Drop All Existing Supabase Tables
-- Run this BEFORE applying supabase_migration_comprehensive.sql
-- This safely removes all tables, handling foreign key dependencies

-- ============================================
-- IMPORTANT: BACKUP YOUR DATA FIRST!
-- ============================================
-- This script will DROP all tables and their data
-- Make sure you have a backup if you need to preserve any data

-- ============================================
-- DROP TABLES (in order to handle dependencies)
-- ============================================

-- Drop child tables first (those with foreign keys)

-- Transaction Items (references transactions)
DROP TABLE IF EXISTS api.transaction_items CASCADE;

-- Transactions (references locations, customers, users)
DROP TABLE IF EXISTS api.transactions CASCADE;

-- Transaction-related tables
DROP TABLE IF EXISTS api.sync_queue CASCADE;

-- Products (references locations, categories)
DROP TABLE IF EXISTS api.products CASCADE;

-- Menu Items (references locations, categories)
DROP TABLE IF EXISTS api.menu_items CASCADE;

-- Modifiers (references locations, menu_items)
DROP TABLE IF EXISTS api.modifiers CASCADE;

-- Services (references locations, service_categories)
DROP TABLE IF EXISTS api.services CASCADE;

-- Appointments (references locations, customers, services, employees)
DROP TABLE IF EXISTS api.appointments CASCADE;

-- Customers (references locations)
DROP TABLE IF EXISTS api.customers CASCADE;

-- Patients (references locations, customers)
DROP TABLE IF EXISTS api.patients CASCADE;

-- Prescriptions (references locations, patients)
DROP TABLE IF EXISTS api.prescriptions CASCADE;

-- Containers (references locations, customers)
DROP TABLE IF EXISTS api.containers CASCADE;

-- Refill History (references locations, containers, customers)
DROP TABLE IF EXISTS api.refill_history CASCADE;

-- Open Items (references locations, item_types, tax_rates)
DROP TABLE IF EXISTS api.open_items CASCADE;

-- Item Types (references locations)
DROP TABLE IF EXISTS api.item_types CASCADE;

-- Tax Rates (references locations)
DROP TABLE IF EXISTS api.tax_rates CASCADE;

-- Employees (references locations, users)
DROP TABLE IF EXISTS api.employees CASCADE;

-- Categories (references locations)
DROP TABLE IF EXISTS api.categories CASCADE;

-- Service Categories (references locations)
DROP TABLE IF EXISTS api.service_categories CASCADE;

-- Barcode Settings (references locations)
DROP TABLE IF EXISTS api.barcode_settings CASCADE;

-- Barcode History (references locations, products)
DROP TABLE IF EXISTS api.barcode_history CASCADE;

-- GST Reports (references locations)
DROP TABLE IF EXISTS api.gst_reports CASCADE;

-- Tax Reports (references locations)
DROP TABLE IF EXISTS api.tax_reports CASCADE;

-- Locations (references users, business_settings)
DROP TABLE IF EXISTS api.locations CASCADE;

-- Businesses (references users)
DROP TABLE IF EXISTS api.businesses CASCADE;

-- Business Settings (references users)
DROP TABLE IF EXISTS api.business_settings CASCADE;

-- Business Types (standalone, no foreign keys)
DROP TABLE IF EXISTS api.business_types CASCADE;

-- Users (standalone, no foreign keys in api schema)
DROP TABLE IF EXISTS api.users CASCADE;

-- ============================================
-- DROP LEGACY TABLES
-- ============================================

-- Legacy orders table
DROP TABLE IF EXISTS api.orders CASCADE;

-- Legacy registrations table
DROP TABLE IF EXISTS api.registrations CASCADE;

-- Legacy medicines table
DROP TABLE IF EXISTS api.medicines CASCADE;

-- Legacy invoices table
DROP TABLE IF EXISTS api.invoices CASCADE;

-- Legacy expenses table
DROP TABLE IF EXISTS api.expenses CASCADE;

-- Legacy attendance table
DROP TABLE IF EXISTS api.attendance CASCADE;

-- Legacy settings table
DROP TABLE IF EXISTS api.settings CASCADE;

-- Legacy subscriptions table
DROP TABLE IF EXISTS api.subscriptions CASCADE;

-- Legacy payments table
DROP TABLE IF EXISTS api.payments CASCADE;

-- ============================================
-- DROP FUNCTIONS (if they exist)
-- ============================================

DROP FUNCTION IF EXISTS api.update_updated_at_column() CASCADE;

-- ============================================
-- DROP SCHEMA (optional - use with caution!)
-- ============================================
-- Uncomment only if you want to completely remove the api schema
-- WARNING: This will delete EVERYTHING in the api schema!
-- DROP SCHEMA IF EXISTS api CASCADE;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this query to verify all tables are dropped:
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'api';

-- Expected result: Should return 0 rows (or only the function if you didn't drop it)
