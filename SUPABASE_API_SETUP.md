# Supabase API Schema Setup Guide

This guide will help you migrate your Supabase tables to the `api` schema for better API access control.

## Important: This Will Delete All Existing Data

⚠️ **WARNING**: Running this migration will:
- **DELETE ALL EXISTING TABLES** in both `public` and `api` schemas
- **DELETE ALL DATA** in those tables
- Recreate tables in the `api` schema

**Make sure to backup your data before proceeding!**

## Step 1: Backup Your Data (IMPORTANT)

Before running the migration:

1. Go to Supabase Dashboard → Database → Tables
2. Export your data using the export feature OR
3. Run this SQL to export data (save the results):
   ```sql
   -- Export users
   SELECT * FROM public.users;
   -- Repeat for each table you want to backup
   ```

## Step 2: Run the Migration

1. Open Supabase Dashboard → **SQL Editor**
2. Click **New Query**
3. Open the file `supabase_migration_api.sql`
4. Copy the entire contents
5. Paste into SQL Editor
6. **Review the script** (especially the DROP statements)
7. Click **Run** (or Ctrl/Cmd + Enter)
8. Wait for completion (should see "Success. No rows returned")

## Step 3: Verify Tables Were Created

1. Go to **Database** → **Tables**
2. You should see all tables listed under the `api` schema:
   - api.users
   - api.registrations
   - api.categories
   - api.products
   - api.orders
   - api.medicines
   - api.invoices
   - api.expenses
   - api.employees
   - api.attendance
   - api.appointments
   - api.services
   - api.settings
   - api.locations
   - api.subscriptions
   - api.payments

## Step 4: Restore Your Data (If Needed)

If you backed up data, restore it using INSERT statements:

```sql
-- Example: Restore users
INSERT INTO api.users (id, businessid, ownername, email, mobile, createdat, updated_at)
VALUES 
  ('user1', 'biz1', 'Owner Name', 'email@example.com', '1234567890', NOW(), NOW()),
  -- Add more rows...
;
```

## Step 5: Verify API Access

1. Go to **Settings** → **API**
2. Your API endpoint will be: `https://your-project.supabase.co/rest/v1/`
3. Test access:
   ```bash
   curl 'https://your-project.supabase.co/rest/v1/users' \
     -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```

## Step 6: Update Your Application

The code has already been updated to use the `api` schema:
- ✅ `src/lib/supabaseClient.ts` - Uses 'api' schema
- ✅ `src/lib/syncManager.ts` - Uses 'api' schema for real-time

**No additional code changes needed!** Just restart your dev server.

## Benefits of API Schema

1. **Better Organization**: Separates API tables from internal tables
2. **Security**: Easier to control access with schema-level permissions
3. **Clear API Structure**: All API-accessible tables in one place
4. **PostgREST Compatibility**: Better integration with Supabase REST API

## Troubleshooting

### "relation does not exist" errors
- Ensure migration completed successfully
- Check Database → Tables to verify tables exist in `api` schema
- Restart your application

### "permission denied for schema api"
- The migration script includes GRANT statements
- If issues persist, manually run:
  ```sql
  GRANT USAGE ON SCHEMA api TO anon;
  GRANT USAGE ON SCHEMA api TO authenticated;
  ```

### Real-time not working
- Go to Database → Replication
- Verify tables in `api` schema are enabled for replication
- Check that ALTER PUBLICATION commands in migration ran successfully

### API returns 404
- Ensure you're using the correct schema: `/rest/v1/users` (PostgREST automatically uses configured schema)
- Check that RLS policies allow access
- Verify API keys are correct

## API Endpoints

Once migrated, your API endpoints will be:

```
GET    /rest/v1/users
POST   /rest/v1/users
PATCH  /rest/v1/users?id=eq.{id}
DELETE /rest/v1/users?id=eq.{id}
```

Same pattern for all tables (categories, products, orders, etc.)

## Security Notes

⚠️ The current RLS policies allow full access for anonymous users. For production:

1. Implement proper authentication
2. Create user-specific RLS policies
3. Restrict access based on user context
4. Use Supabase Auth for user management

Example secure policy:
```sql
-- Example: Only allow users to see their own data
CREATE POLICY "Users can only see own data" ON api.users
  FOR SELECT USING (auth.uid()::text = id);
```

