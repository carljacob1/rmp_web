# Comprehensive Schema Migration Guide

## ✅ Completed Steps

### 1. **Comprehensive Schema SQL Created**
- Created `supabase_migration_comprehensive.sql` 
- Implements full schema structure matching your requirements
- Uses `api` schema (matches current web app config)
- Supports TEXT IDs (for compatibility)
- Includes all tables: transactions, transaction_items, customers, tax_rates, business_settings, etc.
- Includes legacy tables (orders) for backward compatibility during migration

### 2. **IndexedDB Updated**
- Updated `src/lib/indexeddb.ts` with all new stores
- Added 30+ new stores matching comprehensive schema
- Database version incremented to 8
- Backward compatible with existing data

### 3. **Sync Service Updated**
- Updated `src/lib/syncService.ts` to sync all new tables
- Added mappings for all comprehensive schema tables
- Periodic sync updated to include transactions and customers

### 4. **Transaction Utilities Created**
- Created `src/lib/transactionUtils.ts`
- `createTransaction()` function for proper transaction creation
- Automatically creates customers when needed
- Saves to both new schema (transactions + transaction_items) and legacy (orders)

### 5. **Data Migration Utilities**
- Created `src/lib/dataMigration.ts`
- `migrateOrdersToTransactions()` - converts old orders to new structure
- `migrateProductsToNewSchema()` - updates products with relationships
- `runAllMigrations()` - runs all migrations

### 6. **POS Component Updated**
- Updated `src/components/pos/OfflinePOS.tsx`
- Now uses `createTransaction()` from transactionUtils
- Saves to both new schema and legacy format

---

## 📋 Next Steps (Required)

### Step 1: Run Supabase Migration

1. **Backup your data** (if you have existing data):
   ```sql
   -- Export data before migration
   SELECT * FROM api.orders;
   SELECT * FROM api.products;
   -- etc.
   ```

2. **Run the migration SQL**:
   - Open Supabase Dashboard → SQL Editor
   - Copy contents of `supabase_migration_comprehensive.sql`
   - Paste and run
   - Verify all tables were created

3. **Verify tables exist**:
   - Go to Database → Tables
   - Check that all tables are in `api` schema

### Step 2: Update Components (CRUD Operations)

The following components need updates to use the new schema:

#### High Priority:
- ✅ `src/components/pos/OfflinePOS.tsx` - **DONE** (uses transactions)
- ⏳ `src/components/reports/RetailReports.tsx` - Update to query transactions
- ⏳ `src/components/reports/RestaurantReports.tsx` - Update to query transactions
- ⏳ `src/components/reports/TaxReports.tsx` - Update to use tax_rates
- ⏳ `src/components/retail/InventoryDashboard.tsx` - Update product queries

#### Medium Priority:
- ⏳ `src/components/menu/MenuManager.tsx` - Update to use menu_items (restaurant)
- ⏳ `src/components/pharmacy/InventoryTracker.tsx` - Update to use patients, prescriptions
- ⏳ `src/components/service/AppointmentDashboard.tsx` - Update customer relationships
- ⏳ `src/components/refilling/RefillingDashboard.tsx` - Update to use containers, refill_history

#### Low Priority:
- ⏳ Update all customer management features
- ⏳ Update tax management to use tax_rates table
- ⏳ Update location management

### Step 3: Run Data Migration

After running Supabase migration, run data migration in the app:

```typescript
import { runAllMigrations } from '@/lib/dataMigration';

// Run this once after schema is updated
const result = await runAllMigrations();
console.log('Migration result:', result);
```

### Step 4: Update useOfflineStorage Hook

Update `src/hooks/useOfflineStorage.tsx` to add mappings for new tables:

```typescript
const STORE_TO_TABLE_MAP: Record<StoreName, string> = {
  // ... existing mappings
  'transactions': 'transactions',
  'transaction_items': 'transaction_items',
  'customers': 'customers',
  'tax_rates': 'tax_rates',
  'business_settings': 'business_settings',
  // ... all new tables
};
```

### Step 5: Update Reports and Queries

All components that query orders need to be updated:

**Before:**
```typescript
const orders = await dbGetAll('orders');
```

**After:**
```typescript
const transactions = await dbGetAll('transactions');
const transactionItems = await dbGetAll('transaction_items');
// Join them as needed
```

**Example: Getting transaction with items:**
```typescript
import { getTransactionWithItems } from '@/lib/transactionUtils';

const { transaction, items } = await getTransactionWithItems(transactionId);
```

### Step 6: Implement Proper RLS (Security)

Currently, RLS policies are permissive. Update them to use `auth.uid()`:

1. **Enable Supabase Auth** (if not already):
   - Set up authentication in Supabase Dashboard
   - Configure auth providers

2. **Update RLS Policies** in `supabase_migration_comprehensive.sql`:
   - Replace permissive policies with `auth.uid()` checks
   - Example:
     ```sql
     CREATE POLICY "Users can manage own transactions" ON api.transactions
       FOR ALL USING (
         EXISTS (
           SELECT 1 FROM api.locations l
           JOIN api.business_settings bs ON bs.id = l.business_settings_id
           WHERE l.id = transactions.location_id
           AND bs.user_id = auth.uid()
         )
       );
     ```

### Step 7: Customer Management

Update all customer-related features:

1. **Create Customer CRUD Components**:
   - Customer list view
   - Customer create/edit form
   - Customer details view with transaction history

2. **Update POS to use Customer Selection**:
   - Allow selecting existing customer
   - Auto-fill customer info
   - Track customer loyalty points

### Step 8: Tax Management

Update tax calculation to use `tax_rates` table:

1. **Create Tax Rates Management**:
   - CRUD for tax rates
   - Default tax rate per location
   - Support for CGST/SGST/IGST

2. **Update Transaction Creation**:
   - Apply tax rates from database
   - Store tax_rate_id in transaction_items

---

## 🔄 Migration Strategy

### Phase 1: Dual Write (Current)
- ✅ Write to both new schema (transactions) and legacy (orders)
- Allows gradual migration
- Reports can still use orders during transition

### Phase 2: Read from New Schema
- Update all read queries to use transactions
- Keep orders table for reference
- Run data migration to normalize existing orders

### Phase 3: Remove Legacy Support
- After all components migrated
- Remove orders table writes
- Eventually drop orders table (after ensuring all data migrated)

---

## 📊 Schema Comparison

### Old Structure (orders):
```json
{
  "id": "order_123",
  "items": [
    {"name": "Product", "quantity": 2, "price": 100}
  ],
  "customername": "John",
  "customerphone": "1234567890"
}
```

### New Structure (transactions + transaction_items):
```json
// transactions table
{
  "id": "txn_123",
  "customer_id": "customer_456",
  "total": 200
}

// transaction_items table
[
  {"transaction_id": "txn_123", "item_name": "Product", "quantity": 2, "price": 100}
]

// customers table
{
  "id": "customer_456",
  "name": "John",
  "phone": "1234567890"
}
```

---

## ⚠️ Breaking Changes

1. **Orders Table**: 
   - Still exists for backward compatibility
   - New transactions write to both old and new format
   - Eventually orders will be removed

2. **Product Structure**:
   - Now requires `location_id` and `category_id`
   - Migration utility handles this

3. **Customer Data**:
   - No longer embedded in orders
   - Must use customers table

4. **Query Patterns**:
   - Must join transactions with transaction_items
   - Use helper functions from transactionUtils

---

## 🧪 Testing Checklist

- [ ] Run Supabase migration successfully
- [ ] All tables created in api schema
- [ ] IndexedDB upgraded to version 8
- [ ] Create transaction via POS
- [ ] Verify transaction saved to both formats
- [ ] Query transaction with items
- [ ] Customer auto-creation works
- [ ] Data migration runs successfully
- [ ] Reports query new schema
- [ ] Sync service syncs all tables
- [ ] RLS policies work (when auth enabled)

---

## 📝 Notes

- **Backward Compatibility**: Legacy `orders` table maintained during migration
- **Data Safety**: All migrations are non-destructive
- **Gradual Rollout**: Can migrate component by component
- **Testing**: Test thoroughly in development before production

---

## 🆘 Troubleshooting

### Issue: Tables not found
- Check schema is `api` not `public`
- Verify migration SQL ran successfully
- Check Supabase Dashboard → Database → Tables

### Issue: IndexedDB upgrade fails
- Clear browser data
- Force upgrade: `forceDBUpgrade()` from indexeddb.ts

### Issue: Sync errors
- Check table names match between IndexedDB stores and Supabase tables
- Verify Supabase schema is exposed (`api`)
- Check RLS policies allow access

---

## 📚 Additional Resources

- Supabase Migration SQL: `supabase_migration_comprehensive.sql`
- Transaction Utils: `src/lib/transactionUtils.ts`
- Data Migration: `src/lib/dataMigration.ts`
- Schema Analysis: `SCHEMA_ANALYSIS.md`

