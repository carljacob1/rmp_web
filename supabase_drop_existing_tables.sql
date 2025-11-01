-- Drop All Existing Tables - Run this BEFORE running supabase_migration_comprehensive.sql
-- This script safely removes all existing tables from both 'public' and 'api' schemas
-- Run this in Supabase SQL Editor first, then run the comprehensive migration

-- ============================================
-- DROP ALL EXISTING TABLES (Clean Migration)
-- ============================================

-- Drop tables with CASCADE to handle foreign key dependencies
-- Start with tables that have foreign keys first (child tables)
-- Then drop parent tables

-- ============================================
-- DROP FROM API SCHEMA (Primary)
-- ============================================

-- Drop child tables first (those with foreign keys)
DROP TABLE IF EXISTS api.transaction_items CASCADE;
DROP TABLE IF EXISTS api.transaction_items_old CASCADE;

DROP TABLE IF EXISTS api.refill_history CASCADE;
DROP TABLE IF EXISTS api.containers CASCADE;

DROP TABLE IF EXISTS api.prescriptions CASCADE;
DROP TABLE IF EXISTS api.patients CASCADE;

DROP TABLE IF EXISTS api.modifiers CASCADE;
DROP TABLE IF EXISTS api.menu_items CASCADE;

DROP TABLE IF EXISTS api.open_items CASCADE;
DROP TABLE IF EXISTS api.item_types CASCADE;

DROP TABLE IF EXISTS api.barcode_history CASCADE;
DROP TABLE IF EXISTS api.barcode_settings CASCADE;

DROP TABLE IF EXISTS api.tax_reports CASCADE;
DROP TABLE IF EXISTS api.gst_reports CASCADE;

DROP TABLE IF EXISTS api.sync_queue CASCADE;

-- Drop transaction-related tables
DROP TABLE IF EXISTS api.transactions CASCADE;
DROP TABLE IF EXISTS api.transactions_old CASCADE;

-- Drop customer-related tables
DROP TABLE IF EXISTS api.customers CASCADE;
DROP TABLE IF EXISTS api.customers_old CASCADE;

-- Drop location-dependent tables
DROP TABLE IF EXISTS api.tax_rates CASCADE;
DROP TABLE IF EXISTS api.service_categories CASCADE;
DROP TABLE IF EXISTS api.services CASCADE;
DROP TABLE IF EXISTS api.appointments CASCADE;
DROP TABLE IF EXISTS api.appointments_old CASCADE;

DROP TABLE IF EXISTS api.products CASCADE;
DROP TABLE IF EXISTS api.products_old CASCADE;

DROP TABLE IF EXISTS api.categories CASCADE;
DROP TABLE IF EXISTS api.categories_old CASCADE;

DROP TABLE IF EXISTS api.employees CASCADE;
DROP TABLE IF EXISTS api.employees_old CASCADE;

DROP TABLE IF EXISTS api.attendance CASCADE;
DROP TABLE IF EXISTS api.attendance_old CASCADE;

-- Drop location and business tables
DROP TABLE IF EXISTS api.locations CASCADE;
DROP TABLE IF EXISTS api.locations_old CASCADE;

DROP TABLE IF EXISTS api.business_settings CASCADE;
DROP TABLE IF EXISTS api.business_settings_old CASCADE;

DROP TABLE IF EXISTS api.businesses CASCADE;
DROP TABLE IF EXISTS api.business_types CASCADE;

-- Drop user-related tables
DROP TABLE IF EXISTS api.users CASCADE;
DROP TABLE IF EXISTS api.users_old CASCADE;

-- Drop legacy tables
DROP TABLE IF EXISTS api.orders CASCADE;
DROP TABLE IF EXISTS api.orders_old CASCADE;

DROP TABLE IF EXISTS api.registrations CASCADE;
DROP TABLE IF EXISTS api.registrations_old CASCADE;

DROP TABLE IF EXISTS api.medicines CASCADE;
DROP TABLE IF EXISTS api.medicines_old CASCADE;

DROP TABLE IF EXISTS api.invoices CASCADE;
DROP TABLE IF EXISTS api.invoices_old CASCADE;

DROP TABLE IF EXISTS api.expenses CASCADE;
DROP TABLE IF EXISTS api.expenses_old CASCADE;

DROP TABLE IF EXISTS api.settings CASCADE;
DROP TABLE IF EXISTS api.settings_old CASCADE;

DROP TABLE IF EXISTS api.subscriptions CASCADE;
DROP TABLE IF EXISTS api.subscriptions_old CASCADE;

DROP TABLE IF EXISTS api.payments CASCADE;
DROP TABLE IF EXISTS api.payments_old CASCADE;

-- ============================================
-- DROP FROM PUBLIC SCHEMA (If exists)
-- ============================================

-- Drop child tables first
DROP TABLE IF EXISTS public.transaction_items CASCADE;
DROP TABLE IF EXISTS public.refill_history CASCADE;
DROP TABLE IF EXISTS public.containers CASCADE;
DROP TABLE IF EXISTS public.prescriptions CASCADE;
DROP TABLE IF EXISTS public.patients CASCADE;
DROP TABLE IF EXISTS public.modifiers CASCADE;
DROP TABLE IF EXISTS public.menu_items CASCADE;
DROP TABLE IF EXISTS public.open_items CASCADE;
DROP TABLE IF EXISTS public.item_types CASCADE;
DROP TABLE IF EXISTS public.barcode_history CASCADE;
DROP TABLE IF EXISTS public.barcode_settings CASCADE;
DROP TABLE IF EXISTS public.tax_reports CASCADE;
DROP TABLE IF EXISTS public.gst_reports CASCADE;
DROP TABLE IF EXISTS public.sync_queue CASCADE;

-- Drop transaction-related
DROP TABLE IF EXISTS public.transactions CASCADE;

-- Drop customer-related
DROP TABLE IF EXISTS public.customers CASCADE;

-- Drop location-dependent
DROP TABLE IF EXISTS public.tax_rates CASCADE;
DROP TABLE IF EXISTS public.service_categories CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;

-- Drop location and business
DROP TABLE IF EXISTS public.locations CASCADE;
DROP TABLE IF EXISTS public.business_settings CASCADE;
DROP TABLE IF EXISTS public.businesses CASCADE;
DROP TABLE IF EXISTS public.business_types CASCADE;

-- Drop user-related
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop legacy tables
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.registrations CASCADE;
DROP TABLE IF EXISTS public.medicines CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;

-- ============================================
-- DROP FUNCTIONS AND TRIGGERS (Optional)
-- ============================================

-- Drop update timestamp function if exists
DROP FUNCTION IF EXISTS api.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- ============================================
-- CLEANUP NOTES
-- ============================================

-- Note: This script removes ALL data in these tables
-- Make sure to backup your data before running if needed!

-- After running this script, you can run:
-- supabase_migration_comprehensive.sql

-- ============================================
-- VERIFY DROPS (Optional - Run to check)
-- ============================================

-- Uncomment below to verify tables are dropped:
-- SELECT table_name, table_schema 
-- FROM information_schema.tables 
-- WHERE table_schema IN ('api', 'public') 
--   AND table_name IN (
--     'users', 'orders', 'products', 'categories', 'transactions',
--     'transaction_items', 'customers', 'tax_rates', 'business_settings',
--     'locations', 'employees', 'attendance', 'appointments', 'services'
--   )
-- ORDER BY table_schema, table_name;

