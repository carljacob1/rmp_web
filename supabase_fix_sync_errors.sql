-- Quick Fix Script for Sync Errors
-- Run this AFTER supabase_migration_comprehensive.sql
-- Fixes column mismatches and missing tables

-- ============================================
-- ADD MISSING updated_at COLUMNS
-- ============================================

-- Add updated_at to users (map from last_updated)
ALTER TABLE api.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
UPDATE api.users SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;

-- Add updated_at to business_settings
ALTER TABLE api.business_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
UPDATE api.business_settings SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;

-- Add updated_at to all other tables
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
ALTER TABLE api.barcode_history ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.gst_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.tax_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

-- Add legacy compatibility columns
ALTER TABLE api.locations ADD COLUMN IF NOT EXISTS manager TEXT;
ALTER TABLE api.locations ADD COLUMN IF NOT EXISTS createdat TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.categories ADD COLUMN IF NOT EXISTS sortorder INTEGER;
ALTER TABLE api.categories ADD COLUMN IF NOT EXISTS createdat TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.products ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE api.products ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE api.products ADD COLUMN IF NOT EXISTS available BOOLEAN;
ALTER TABLE api.products ADD COLUMN IF NOT EXISTS stock INTEGER;
ALTER TABLE api.products ADD COLUMN IF NOT EXISTS lowstockthreshold INTEGER;
ALTER TABLE api.products ADD COLUMN IF NOT EXISTS expirydate TIMESTAMP WITH TIME ZONE;
ALTER TABLE api.products ADD COLUMN IF NOT EXISTS modifiers JSONB;
ALTER TABLE api.products ADD COLUMN IF NOT EXISTS variations JSONB;
ALTER TABLE api.products ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE api.products ADD COLUMN IF NOT EXISTS createdat TIMESTAMP WITH TIME ZONE;

-- Initialize updated_at from last_updated or created_at
UPDATE api.locations SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.locations SET createdat = COALESCE(created_at, NOW()) WHERE createdat IS NULL;
UPDATE api.categories SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.categories SET createdat = COALESCE(created_at, NOW()) WHERE createdat IS NULL;
UPDATE api.products SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.products SET createdat = COALESCE(created_at, NOW()) WHERE createdat IS NULL;
-- Map legacy fields to new fields for products
UPDATE api.products SET available = COALESCE(available, is_active) WHERE available IS NULL;
UPDATE api.products SET stock = COALESCE(stock, stock_quantity) WHERE stock IS NULL;
UPDATE api.products SET lowstockthreshold = COALESCE(lowstockthreshold, low_stock_threshold) WHERE lowstockthreshold IS NULL;
UPDATE api.products SET image = COALESCE(image, image_url) WHERE image IS NULL;
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
UPDATE api.barcode_history SET updated_at = COALESCE(created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.gst_reports SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE api.tax_reports SET updated_at = COALESCE(last_updated, created_at, NOW()) WHERE updated_at IS NULL;

-- ============================================
-- CREATE INDEXES FOR updated_at (for better sync performance)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_updated_at ON api.users(updated_at);
CREATE INDEX IF NOT EXISTS idx_business_settings_updated_at ON api.business_settings(updated_at);
CREATE INDEX IF NOT EXISTS idx_locations_updated_at ON api.locations(updated_at);
CREATE INDEX IF NOT EXISTS idx_categories_updated_at ON api.categories(updated_at);
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON api.products(updated_at);
CREATE INDEX IF NOT EXISTS idx_customers_updated_at ON api.customers(updated_at);
CREATE INDEX IF NOT EXISTS idx_transactions_updated_at ON api.transactions(updated_at);
CREATE INDEX IF NOT EXISTS idx_transaction_items_updated_at ON api.transaction_items(updated_at);

