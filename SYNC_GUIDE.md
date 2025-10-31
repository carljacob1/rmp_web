# Offline-First Sync System Guide

This document explains the complete offline-first synchronization system implemented in this project.

## Overview

The system provides **seamless bidirectional synchronization** between:
- **Local Storage**: IndexedDB (offline database)
- **Cloud Storage**: Supabase (online database)

**Key Features:**
- ✅ Works offline - all data stored in IndexedDB
- ✅ Works online - automatic sync with Supabase
- ✅ Real-time updates when online
- ✅ Conflict resolution (last-write-wins using timestamps)
- ✅ Sync queue for offline changes
- ✅ Auto-sync when connection is restored
- ✅ Periodic background sync

## Architecture

### 1. **Storage Layer** (`src/lib/indexeddb.ts`)
- Manages all IndexedDB operations
- Stores: `categories`, `products`, `orders`, `employees`, `attendance`, `appointments`, `services`, `medicines`, `invoices`, `expenses`, `settings`, `users`, `registrations`, `syncQueue`
- Database version: 5

### 2. **Sync Manager** (`src/lib/syncManager.ts`)
- **Bidirectional Sync**: Syncs data both ways (Supabase ↔ IndexedDB)
- **Conflict Resolution**: Last-write-wins using `updated_at` timestamps
- **Sync Queue**: Tracks offline changes to sync when online
- **Real-time Subscriptions**: Listens to Supabase changes

### 3. **Offline Storage Hook** (`src/hooks/useOfflineStorage.tsx`)
- Enhanced React hook for offline-first data management
- Automatically saves to IndexedDB
- Queues changes for sync when offline
- Provides sync status and controls

### 4. **Sync Service** (`src/lib/syncService.ts`)
- Global sync initialization
- Periodic background sync (every 30 seconds)
- Auto-sync on connection restore
- Manual sync trigger

## How It Works

### Online Mode (Connected)

1. **Initial Load**:
   - App loads data from IndexedDB (fast, local)
   - Simultaneously syncs with Supabase
   - Updates IndexedDB with latest from Supabase

2. **Data Operations**:
   - **Save/Update/Delete**: Saves to IndexedDB immediately, then syncs to Supabase
   - **Real-time Updates**: Listens to Supabase changes and updates IndexedDB automatically

3. **Periodic Sync**:
   - Background sync every 30 seconds
   - Processes sync queue
   - Syncs critical tables (products, orders, categories)

### Offline Mode (Disconnected)

1. **Data Operations**:
   - All operations save to IndexedDB only
   - Changes are queued in `syncQueue` store
   - App works normally with local data

2. **Connection Restored**:
   - Automatically detects online status
   - Processes sync queue
   - Syncs all tables bidirectionally
   - Resolves conflicts using timestamps

## Conflict Resolution Strategy

**Last-Write-Wins**:
- Uses `updated_at` timestamp (falls back to `created_at`)
- If timestamps are equal, prefers remote (Supabase as source of truth)
- Ensures data consistency across devices

**Example**:
```
Local Item: { id: '1', name: 'Product A', updated_at: '2024-01-01T10:00:00Z' }
Remote Item: { id: '1', name: 'Product B', updated_at: '2024-01-01T11:00:00Z' }
Result: Remote wins (newer timestamp) → Product B
```

## Usage Examples

### Using the Offline Storage Hook

```typescript
import { useOfflineStorage } from '@/hooks/useOfflineStorage';

function MyComponent() {
  const {
    data,
    loading,
    saveData,
    updateData,
    deleteData,
    syncData,
    isOnline,
    syncStatus
  } = useOfflineStorage<Product>('products', 'products');

  // Save data (works offline & online)
  const handleSave = async () => {
    await saveData({
      id: 'product_1',
      name: 'New Product',
      price: 100
    });
    // Automatically synced if online, queued if offline
  };

  // Manual sync
  const handleSync = async () => {
    if (isOnline) {
      await syncData();
    }
  };

  return (
    <div>
      <p>Status: {isOnline ? 'Online' : 'Offline'}</p>
      <p>Pending: {syncStatus.pendingChanges}</p>
      {/* Your UI */}
    </div>
  );
}
```

### Using Direct IndexedDB (for components that don't use the hook)

```typescript
import { dbGetAll, dbPut, dbDelete } from '@/lib/indexeddb';
import { addToSyncQueue, syncTable } from '@/lib/syncManager';

// Load data
const products = await dbGetAll<Product>('products');

// Save data
await dbPut('products', product);
if (navigator.onLine) {
  await syncTable('products', 'products');
} else {
  await addToSyncQueue('products', 'upsert', product);
}
```

### Sync Status Component

```typescript
import { SyncStatus } from '@/components/common/SyncStatus';

function Settings() {
  return (
    <div>
      <SyncStatus /> {/* Full status card */}
      <SyncStatus compact /> {/* Compact badge */}
    </div>
  );
}
```

## Table Mappings

The system maps IndexedDB stores to Supabase tables:

| IndexedDB Store | Supabase Table |
|----------------|----------------|
| `categories` | `categories` |
| `products` | `products` |
| `orders` | `orders` |
| `employees` | `employees` |
| `attendance` | `attendance` |
| `appointments` | `appointments` |
| `services` | `services` |
| `medicines` | `medicines` |
| `invoices` | `invoices` |
| `expenses` | `expenses` |
| `settings` | `settings` |
| `users` | `users` |
| `registrations` | `registrations` |

## Data Flow Diagram

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Component      │
│  (React Hook)    │
└──────┬───────────┘
       │
       ▼
┌─────────────────┐     Online?      ┌──────────────┐
│  IndexedDB      │◄───Yes──►         │  Supabase    │
│  (Local)        │                  │  (Cloud)     │
│                 │                  │              │
│  ┌───────────┐ │                  │              │
│  │syncQueue  │ │◄───No───Queue─────┘              │
│  └───────────┘ │                                   │
└─────────────────┘                                   │
        ▲                                            │
        │                                             │
        └────────────────Real-time Updates───────────┘
```

## Best Practices

1. **Always use timestamps**: Ensure your data has `updated_at` and `created_at` fields
2. **Handle offline gracefully**: Show offline indicators to users
3. **Monitor sync status**: Use `SyncStatus` component to show sync state
4. **Test offline mode**: Disable network in DevTools to test offline functionality
5. **Sync queue monitoring**: Check `syncQueue` store for pending changes

## Troubleshooting

### Sync not working
- Check Supabase credentials in `.env`
- Verify tables exist in Supabase
- Check browser console for errors
- Verify IndexedDB is enabled in browser

### Data conflicts
- Check timestamps are being set correctly
- Verify `updated_at` fields exist in data
- Review conflict resolution logs in console

### Offline changes not syncing
- Check `syncQueue` store in IndexedDB
- Verify online status detection
- Manually trigger sync using `triggerSync()`

### Real-time updates not working
- Ensure Supabase Realtime is enabled for tables
- Check table policies allow subscriptions
- Verify Supabase client is initialized

## Migration from Old System

The old `sync.ts` file is still present but the new system uses:
- `syncManager.ts` - Enhanced sync logic
- `syncService.ts` - Global sync orchestration
- `useOfflineStorage.tsx` - React hook integration

Old code will continue to work but should be migrated to use the new hooks for better offline support.

## Performance Considerations

- **IndexedDB First**: All reads are from IndexedDB (fast)
- **Background Sync**: Syncs happen in background (non-blocking)
- **Batch Operations**: Multiple changes are batched together
- **Smart Sync**: Only syncs changed tables
- **Queue Limits**: Sync queue retries up to 3 times before giving up

## Security Notes

- All Supabase operations respect RLS (Row Level Security) policies
- Local IndexedDB data is stored in browser (not encrypted)
- Sync queue stores sensitive data temporarily
- Consider encrypting sensitive data before storing locally


