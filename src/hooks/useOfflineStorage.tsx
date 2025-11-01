// Enhanced Offline Storage Hook: Full IndexedDB persistence with sync
import { useState, useEffect, useCallback } from 'react';
import { dbGetAll, dbPut, dbDelete, StoreName } from '@/lib/indexeddb';
import { addToSyncQueue } from '@/lib/syncManager';
import { getCurrentUserId, filterByUserId } from '@/lib/userUtils';

interface OfflineStorageHook<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  saveData: (item: T) => Promise<void>;
  updateData: (id: string, item: Partial<T>) => Promise<void>;
  deleteData: (id: string) => Promise<void>;
  clearData: () => Promise<void>;
  refreshData: () => Promise<void>;
}

// Map localStorage keys to IndexedDB store names
const KEY_TO_STORE_MAP: Record<string, StoreName> = {
  'pos_orders': 'orders',
  'products': 'products',
  'categories': 'categories',
  'employees': 'employees',
  'attendance': 'attendance',
  'appointments': 'appointments',
  'services': 'services',
  'medicines': 'medicines',
  'invoices': 'invoices',
  'expenses': 'expenses',
  'tax_entries': 'orders',
  'refilling_vessels': 'products',
  'refill_transactions': 'orders'
};

// Map store names to Supabase table names
const STORE_TO_TABLE_MAP: Record<StoreName, string> = {
  'users': 'users',
  'currentUser': 'users', // Not synced separately
  'registrations': 'registrations',
  'appointments': 'appointments',
  'services': 'services',
  'medicines': 'medicines',
  'invoices': 'invoices',
  'expenses': 'expenses',
  'categories': 'categories',
  'orders': 'orders',
  'products': 'products',
  'settings': 'settings',
  'employees': 'employees',
  'attendance': 'attendance',
  'syncQueue': 'syncQueue', // Not synced
  'locations': 'locations',
  'subscriptions': 'subscriptions',
  'payments': 'payments'
};

export function useOfflineStorage<T extends { id: string; updated_at?: string; created_at?: string }>(
  storeName: string,
  localStorageKey: string
): OfflineStorageHook<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine the actual IndexedDB store name
  const dbStoreName: StoreName = (KEY_TO_STORE_MAP[localStorageKey] || storeName as StoreName);

  // Load data from IndexedDB on mount
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load from IndexedDB
      const userId = await getCurrentUserId();
      const items = await dbGetAll<T>(dbStoreName);
      // Filter by userId to show only current user's data
      const userItems = userId ? filterByUserId(items, userId) : items;
      setData(userItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [dbStoreName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save data: Always save to IndexedDB only
  const saveData = useCallback(async (item: T): Promise<void> => {
    try {
      setError(null);

      // Get current user ID for data isolation
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Please log in to save data');
      }

      // Ensure timestamps
      const now = new Date().toISOString();
      const itemWithTimestamps: T = {
        ...item,
        userId: userId, // Add userId for data isolation
        updated_at: item.updated_at || now,
        created_at: item.created_at || now
      } as T;

      // Save to IndexedDB
      await dbPut(dbStoreName, itemWithTimestamps);
      
      // Add to sync queue (will sync if online, queue if offline)
      const tableName = STORE_TO_TABLE_MAP[dbStoreName];
      if (tableName && tableName !== 'syncQueue' && tableName !== 'currentUser') {
        try {
          // Check if item exists to determine operation type
          const existing = data.find(d => d.id === item.id);
          const operation = existing ? 'update' : 'insert';
          await addToSyncQueue(tableName, operation === 'insert' ? 'upsert' : 'upsert', itemWithTimestamps);
        } catch (syncError) {
          console.warn('[useOfflineStorage] Failed to add to sync queue:', syncError);
          // Don't throw - saving to IndexedDB succeeded, sync can retry later
        }
      }
      
      // Update local state
      setData(prev => {
        const existing = prev.find(d => d.id === item.id);
        if (existing) {
          return prev.map(d => d.id === item.id ? itemWithTimestamps : d);
        } else {
          return [...prev, itemWithTimestamps];
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save data');
      throw err;
    }
  }, [dbStoreName, data]);

  // Update data
  const updateData = useCallback(async (id: string, updates: Partial<T>): Promise<void> => {
    try {
      setError(null);

      // Get existing item
      const existing = data.find(item => item.id === id);
      if (!existing) {
        throw new Error(`Item with id ${id} not found`);
      }

      // Merge updates with existing data
      const updatedItem: T = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString()
      } as T;

      // Save using saveData
      await saveData(updatedItem);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update data');
      throw err;
    }
  }, [data, saveData]);

  // Delete data
  const deleteData = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);

      // Get item before deleting for sync queue
      const itemToDelete = data.find(item => item.id === id);
      
      // Remove from IndexedDB
      await dbDelete(dbStoreName, id);

      // Add delete to sync queue
      const tableName = STORE_TO_TABLE_MAP[dbStoreName];
      if (tableName && tableName !== 'syncQueue' && tableName !== 'currentUser' && itemToDelete) {
        try {
          await addToSyncQueue(tableName, 'delete', itemToDelete);
        } catch (syncError) {
          console.warn('[useOfflineStorage] Failed to add delete to sync queue:', syncError);
          // Don't throw - deletion from IndexedDB succeeded, sync can retry later
        }
      }

      // Update local state
      setData(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete data');
      throw err;
    }
  }, [dbStoreName]);

  // Clear all data
  const clearData = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      
      // Clear from IndexedDB
      const allItems = await dbGetAll<T>(dbStoreName);
      for (const item of allItems) {
        await dbDelete(dbStoreName, item.id);
      }
      
      setData([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear data');
      throw err;
    }
  }, [dbStoreName]);

  // Refresh data from IndexedDB
  const refreshData = useCallback(async (): Promise<void> => {
    await loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    saveData,
    updateData,
    deleteData,
    clearData,
    refreshData
  };
}
