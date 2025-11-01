# Sync Errors Fix Guide

## Errors Fixed

### 1. Missing `updated_at` Column
**Error:** `column users.updated_at does not exist`

**Fix:** Added `updated_at` column to all tables in the migration SQL. The sync code expects `updated_at` but the schema uses `last_updated`. Both columns are now maintained.

### 2. Missing `registrations` Table
**Error:** `Could not find the table 'api.registrations' in the schema cache`

**Fix:** Added `api.registrations` table to the migration SQL with proper structure and RLS policies.

### 3. Column Name Mismatch
**Issue:** Sync code expects `updated_at` but schema has `last_updated`

**Fix:** 
- Updated sync manager to handle both column names
- Added `updated_at` columns to all tables
- Triggers update both `last_updated` and `updated_at` on updates

## How to Apply Fixes

### Step 1: Run the Migration
Execute `supabase_migration_comprehensive.sql` in Supabase SQL Editor.

### Step 2: Run the Quick Fix (if needed)
If tables already exist, run `supabase_fix_sync_errors.sql` to add missing columns.

### Step 3: Verify Schema Configuration
1. Go to Supabase Dashboard → Settings → API
2. Check "Database Settings" → "Exposed Schemas"
3. Ensure `api` is listed (or set to `public,api`)

### Step 4: Restart Web App
Refresh your web app to reload the sync service with the updated code.

## What Was Changed

### Database Schema (`supabase_migration_comprehensive.sql`)
- ✅ Added `updated_at` column to all tables
- ✅ Added `api.registrations` table
- ✅ Added RLS policy for registrations
- ✅ Updated triggers to maintain both `last_updated` and `updated_at`
- ✅ Added indexes on `updated_at` columns

### Sync Manager (`src/lib/syncManager.ts`)
- ✅ Handles both `updated_at` and `last_updated` columns
- ✅ Normalizes `last_updated` to `updated_at` in sync operations
- ✅ Proper conflict resolution using either column
- ✅ Fixed timestamp handling in sync operations

## Testing

After applying fixes, check browser console for:
- ✅ No more "column does not exist" errors
- ✅ No more "table not found" errors  
- ✅ Successful sync messages: `[Sync] Synced X items from [table]`

## Troubleshooting

If errors persist:
1. Check Supabase dashboard → Table Editor → verify `updated_at` columns exist
2. Verify `api` schema is exposed in API settings
3. Check browser console for specific error codes
4. Run `supabase_fix_sync_errors.sql` again to ensure all columns exist

