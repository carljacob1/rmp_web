# Supabase Integration Setup Guide

This guide will help you set up Supabase for real-time synchronization with your POS application.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A Supabase project created

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in your project details:
   - Name: Your project name
   - Database Password: Choose a strong password
   - Region: Choose closest to your users
4. Wait for the project to be created (takes ~2 minutes)

## Step 2: Run Database Migration

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click **New Query**
3. Open the file `supabase_migration.sql` from this project
4. Copy the entire contents and paste into the SQL Editor
5. Click **Run** (or press Ctrl/Cmd + Enter)
6. Wait for the migration to complete (should see "Success. No rows returned")

This will create all necessary tables:
- users
- registrations
- categories
- products
- orders
- medicines
- invoices
- expenses
- employees
- attendance
- appointments
- services
- settings
- locations
- subscriptions
- payments

## Step 3: Enable Real-Time (Optional but Recommended)

Real-time is usually enabled by default, but to verify:

1. Go to **Database** → **Replication** in your Supabase dashboard
2. Ensure all tables are listed and enabled for replication
3. If not, you can run the commented ALTER PUBLICATION commands from the migration file

## Step 4: Configure Row Level Security (RLS)

The migration script creates policies that allow all operations for anonymous users. **For production**, you should:

1. Go to **Authentication** → **Policies** in Supabase dashboard
2. Review and update policies based on your security requirements
3. Consider implementing user-based RLS policies for multi-tenant isolation

## Step 5: Get API Keys

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy the following:
   - **Project URL** (under Project Settings)
   - **anon/public key** (under API Keys)

## Step 6: Configure Environment Variables

1. Create a `.env` file in the root of your project (if it doesn't exist)
2. Add the following:

```env
VITE_SUPABASE_URL=your-project-url-here
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace:
- `your-project-url-here` with your Project URL
- `your-anon-key-here` with your anon/public key

3. Restart your development server

## Step 7: Verify Setup

1. Start your application: `npm run dev`
2. Open browser console (F12)
3. Look for these messages:
   - `[Sync Service] Starting initial sync...`
   - `[Sync Service] Initial sync complete`
   - `[Sync Service] Real-time subscriptions setup complete for X tables`

If you see these, your Supabase integration is working!

## How It Works

### Online Mode
- All CRUD operations save to IndexedDB immediately
- Changes are automatically synced to Supabase
- Real-time updates from Supabase sync back to IndexedDB
- Periodic background sync every 30 seconds

### Offline Mode
- All operations work normally with IndexedDB
- Changes are queued for sync when connection is restored
- Automatic sync happens when coming back online

### Conflict Resolution
- Uses "last-write-wins" strategy based on `updated_at` timestamps
- Remote changes always take precedence if timestamps are equal

## Troubleshooting

### "Supabase not available" warning
- Check that `.env` file exists and has correct values
- Restart development server after adding/changing `.env`
- Ensure no typos in environment variable names

### "PGRST205" errors
- This means table doesn't exist or schema mismatch
- Run the migration script again
- Verify tables exist in Supabase dashboard → Database → Tables

### Real-time not working
- Go to Database → Replication and ensure tables are enabled
- Check browser console for subscription errors
- Verify network connection

### Data not syncing
- Check browser console for sync errors
- Verify you're online (`navigator.onLine`)
- Check Supabase dashboard for any API errors
- Try manual sync by refreshing the page

## Manual Sync

The app automatically syncs, but you can also:

1. Refresh the page (triggers initial sync)
2. Check sync status in browser console:
   ```javascript
   import { getSyncStatus } from '@/lib/syncService';
   const status = await getSyncStatus();
   console.log(status);
   ```

## Security Notes

⚠️ **Important**: The default RLS policies allow full access for anonymous users. For production:

1. Implement proper authentication
2. Create user-specific RLS policies
3. Restrict access based on `userId` or other user attributes
4. Consider using Supabase Auth for user management

## Support

If you encounter issues:
1. Check browser console for error messages
2. Check Supabase dashboard → Logs for server-side errors
3. Verify all environment variables are set correctly
4. Ensure migration script ran successfully

