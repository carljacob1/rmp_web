# Migration Instructions - Step by Step

## ⚠️ IMPORTANT: Backup Your Data First!

Before running any migration, **export/backup your existing data** if you have any:

1. Go to Supabase Dashboard → Database → Tables
2. Export data from tables you need
3. Or run SQL export queries for each table

---

## Step 1: Drop Existing Tables

You have existing tables in Supabase, so you need to drop them first.

### Option A: Use the Drop Script (Recommended)

1. Open Supabase Dashboard → **SQL Editor**
2. Click **New Query**
3. Open `supabase_drop_existing_tables.sql`
4. Copy the entire contents
5. Paste into SQL Editor
6. **Review carefully** - this will DELETE ALL DATA
7. Click **Run** (or Ctrl/Cmd + Enter)
8. Wait for completion

This script will:
- ✅ Drop all tables from `api` schema
- ✅ Drop all tables from `public` schema  
- ✅ Handle foreign key dependencies safely
- ✅ Drop functions and triggers

### Option B: Manual Drop (Alternative)

If you prefer to drop tables manually, you can run:

```sql
-- Drop specific tables you have
DROP TABLE IF EXISTS api.orders CASCADE;
DROP TABLE IF EXISTS api.products CASCADE;
DROP TABLE IF EXISTS api.categories CASCADE;
-- ... etc for each table you have
```

---

## Step 2: Run Comprehensive Migration

After dropping existing tables:

1. Still in **SQL Editor**, click **New Query** (or clear current)
2. Open `supabase_migration_comprehensive.sql`
3. Copy the entire contents
4. Paste into SQL Editor
5. **Review the script** (especially table structures)
6. Click **Run**
7. Wait for completion (may take 30-60 seconds)
8. You should see "Success. No rows returned"

---

## Step 3: Verify Tables Created

1. Go to **Database** → **Tables**
2. You should see all tables under `api` schema:
   - ✅ `users`
   - ✅ `business_settings`
   - ✅ `locations`
   - ✅ `categories`
   - ✅ `products`
   - ✅ `customers`
   - ✅ `transactions`
   - ✅ `transaction_items`
   - ✅ `tax_rates`
   - ✅ ... and 20+ more tables

---

## Step 4: Verify Schema Configuration

1. Go to **Settings** → **API**
2. Check **Database Settings** → **Exposed Schemas**
3. Make sure `api` is in the list
4. If not, add `api` to exposed schemas

---

## Step 5: Update Your App

1. **Clear browser cache** (or use Incognito mode)
2. **Open your app**
3. IndexedDB will automatically upgrade to version 8
4. All new stores will be created

---

## Step 6: Run Data Migration (If You Had Existing Data)

If you had existing data and want to migrate it:

### Option A: Using Migration Utility (In Browser Console)

1. Open your app
2. Open browser DevTools (F12)
3. Go to Console tab
4. Run:

```javascript
// Import the migration utility
import { runAllMigrations } from './lib/dataMigration';

// Run migration
const result = await runAllMigrations();
console.log('Migration result:', result);
```

### Option B: Add to App Initialization

Add to your app's initialization code:

```typescript
// In App.tsx or main initialization
import { runAllMigrations } from '@/lib/dataMigration';

// Run once on first load after schema update
const migrationRun = localStorage.getItem('migration_run');
if (!migrationRun) {
  try {
    const result = await runAllMigrations();
    console.log('Data migration complete:', result);
    localStorage.setItem('migration_run', 'true');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}
```

---

## ⚠️ Troubleshooting

### Error: "relation does not exist"

**Cause**: Tables weren't dropped properly  
**Solution**: Run the drop script again, or manually drop each table

### Error: "permission denied for schema api"

**Cause**: Schema not exposed  
**Solution**: Go to Settings → API → Exposed Schemas → Add `api`

### Error: "table already exists"

**Cause**: Migration partially ran before  
**Solution**: Run drop script first, then migration again

### IndexedDB Upgrade Fails

**Cause**: Browser cache or multiple tabs  
**Solution**: 
1. Close all tabs with your app
2. Clear browser cache
3. Or run: `forceDBUpgrade()` from browser console

---

## 📋 Migration Checklist

- [ ] **Backed up existing data** (if needed)
- [ ] **Dropped existing tables** using drop script
- [ ] **Ran comprehensive migration** SQL
- [ ] **Verified tables created** in Supabase Dashboard
- [ ] **Verified schema exposed** (api schema)
- [ ] **Cleared browser cache**
- [ ] **Tested app loads** without errors
- [ ] **IndexedDB upgraded** to version 8
- [ ] **Ran data migration** (if had existing data)
- [ ] **Tested creating transaction** via POS
- [ ] **Verified sync works** (if online)

---

## 🔄 Rollback Plan (If Something Goes Wrong)

If you need to rollback:

1. **If migration failed mid-way**:
   - Run drop script to clean up partial tables
   - Restore from backup (if you had one)
   - Re-run migration

2. **If app breaks**:
   - Clear browser IndexedDB
   - Check Supabase tables still exist
   - Verify schema is `api`

3. **If data is lost**:
   - Restore from backup
   - Re-import data

---

## 📞 Need Help?

Refer to:
- `MIGRATION_GUIDE.md` - Detailed migration guide
- `MIGRATION_SUMMARY.md` - What was implemented
- `SCHEMA_ANALYSIS.md` - Schema comparison

---

## ✅ Success Indicators

You'll know migration succeeded when:

1. ✅ All tables appear in Supabase Dashboard (api schema)
2. ✅ App loads without errors
3. ✅ IndexedDB shows version 8
4. ✅ Can create transactions via POS
5. ✅ Data syncs to Supabase (if online)

---

**Good luck with your migration! 🚀**

