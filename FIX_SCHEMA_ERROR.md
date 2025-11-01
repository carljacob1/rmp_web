# Fix: PGRST106 Schema Error

## Error Message
```
code: 'PGRST106'
message: 'The schema must be one of the following: api'
```

## What This Means

This error occurs when Supabase PostgREST is not configured to expose the `api` schema. Even though your tables are in the `api` schema and your code is configured correctly, PostgREST needs to be explicitly told which schemas to expose.

## Solution

### Step 1: Configure Supabase Dashboard

1. Go to your **Supabase Dashboard**
2. Select your project
3. Navigate to **Settings** → **API**
4. Scroll down to **Database Settings**
5. Find **Exposed Schemas** (or **db_schemas**)
6. You should see something like: `public`
7. Change it to: `api` (or add `api` if multiple schemas are allowed)
8. **Save** the changes

### Step 2: Verify Configuration

After saving, the exposed schemas should show: `api`

### Step 3: Test the Fix

1. **Restart your development server**
2. **Refresh your browser**
3. Check the console - errors should be gone
4. You should see successful sync messages:
   ```
   [Sync] Synced X items from products to products
   ```

## Alternative: If Exposed Schemas Setting is Not Available

If you don't see the "Exposed Schemas" setting in your Supabase Dashboard:

### Option A: Use Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
supabase db remote set --db-url "postgresql://..."
# Then configure in the CLI
```

### Option B: Contact Supabase Support

If the setting is not available in your dashboard, you may need to:
1. Contact Supabase support
2. Or check if your project tier supports schema configuration

### Option C: Use Public Schema Instead

If you cannot expose the `api` schema, you can migrate back to `public` schema:

1. Use `supabase_migration.sql` instead of `supabase_migration_api.sql`
2. Change `src/lib/supabaseClient.ts` to use `'public'` schema
3. Change `src/lib/syncManager.ts` to use `'public'` schema

## Verification

After fixing, you should see:

✅ **Success**: Sync messages without errors
✅ **Success**: Data syncing between IndexedDB and Supabase
✅ **Success**: Real-time updates working

❌ **Still seeing errors?** Check:
- Environment variables are set correctly
- Tables exist in `api` schema (Database → Tables)
- RLS policies allow access
- Network connection is stable

## Quick Test Query

You can test if the schema is exposed by running this in your browser console:

```javascript
import { getSupabaseClient } from './lib/supabaseClient';
const sb = getSupabaseClient();
const { data, error } = await sb.from('products').select('*').limit(1);
console.log('Test result:', { data, error });
```

If you see data (or empty array `[]`) without errors, it's working!
If you see PGRST106 error, the schema is not exposed yet.

