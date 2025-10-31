// Enhanced Offline Storage Hook: Full IndexedDB persistence with bidirectional sync
import { useState, useEffect, useCallback } from 'react';
import { dbGetAll, dbPut, dbDelete, StoreName } from '@/lib/indexeddb';
import { syncTable, addToSyncQueue, subscribeToTable, SyncStatus } from '@/lib/syncManager';
import { getSupabaseClient } from '@/lib/supabaseClient';

interface OfflineStorageHook<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  saveData: (item: T, syncTable?: string) => Promise<void>;
  updateData: (id: string, item: Partial<T>, syncTable?: string) => Promise<void>;
  deleteData: (id: string, syncTable?: string) => Promise<void>;
  clearData: () => Promise<void>;
  syncData: (syncTable?: string) => Promise<void>;
  isOnline: boolean;
  syncStatus: SyncStatus;
  refreshData: () => Promise<void>;
}

// Map of store names to Supabase table names
const STORE_TO_TABLE_MAP: Record<string, string> = {
  'pos-orders': 'orders',
  'products': 'products',
  'categories': 'categories',
  'employees': 'employees',
  'attendance': 'attendance',
  'appointments': 'appointments',
  'services': 'services',
  'medicines': 'medicines',
  'invoices': 'invoices',
  'expenses': 'expenses',
  'taxEntries': 'tax_entries',
  'vessels': 'vessels',
  'refillTransactions': 'refill_transactions'
};

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
  'tax_entries': 'orders', // Use orders table for tax entries
  'refilling_vessels': 'products', // Use products table for vessels
  'refill_transactions': 'orders' // Use orders table for refill transactions
};

export function useOfflineStorage<T extends { id: string; updated_at?: string; created_at?: string }>(
  storeName: string,
  localStorageKey: string
): OfflineStorageHook<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine !== false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncTime: null,
    pendingChanges: 0,
    error: null
  });

  // Determine the actual IndexedDB store name
  const dbStoreName: StoreName = (KEY_TO_STORE_MAP[localStorageKey] || storeName as StoreName);
  
  // Determine Supabase table name
  const supabaseTable = STORE_TO_TABLE_MAP[storeName] || STORE_TO_TABLE_MAP[localStorageKey] || storeName;

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming online
      syncData();
    };
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine !== false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load data from IndexedDB on mount
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load from IndexedDB
      const items = await dbGetAll<T>(dbStoreName);
      setData(items);

      // Update pending changes count
      const { getSyncQueue } = await import('@/lib/syncManager');
      const queue = await getSyncQueue();
      const pendingForTable = queue.filter(item => item.table === supabaseTable).length;
      setSyncStatus(prev => ({ ...prev, pendingChanges: pendingForTable }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [dbStoreName, supabaseTable]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Set up real-time subscription when online
  useEffect(() => {
    if (!isOnline) return;

    const sb = getSupabaseClient();
    if (!sb) return;

    const unsubscribe = subscribeToTable(
      supabaseTable,
      dbStoreName,
      (updatedData) => {
        if (updatedData === null) {
          // Deletion
          loadData();
        } else {
          // Update or insert
          setData(prev => {
            const existing = prev.find(item => item.id === updatedData.id);
            if (existing) {
              return prev.map(item => item.id === updatedData.id ? updatedData as T : item);
            } else {
              return [...prev, updatedData as T];
            }
          });
        }
      }
    );

    return unsubscribe;
  }, [isOnline, supabaseTable, dbStoreName, loadData]);

  // Save data: Always save to IndexedDB, queue for sync if offline
  const saveData = useCallback(async (item: T, customTable?: string): Promise<void> => {
    try {
      setError(null);

      // Ensure timestamps
      const now = new Date().toISOString();
      const itemWithTimestamps: T = {
        ...item,
        updated_at: item.updated_at || now,
        created_at: item.created_at || now
      } as T;

      // Always save to IndexedDB (offline-first)
      await dbPut(dbStoreName, itemWithTimestamps);
      
      // Update local state
      setData(prev => {
        const existing = prev.find(d => d.id === item.id);
        if (existing) {
          return prev.map(d => d.id === item.id ? itemWithTimestamps : d);
        } else {
          return [...prev, itemWithTimestamps];
        }
      });

      // If online, try to sync immediately
      const table = customTable || supabaseTable;
      if (isOnline) {
        try {
          await syncData(table);
        } catch (syncError) {
          // If sync fails, add to queue
          await addToSyncQueue(table, 'upsert', itemWithTimestamps);
          setSyncStatus(prev => ({ ...prev, pendingChanges: prev.pendingChanges + 1 }));
        }
      } else {
        // If offline, add to sync queue
        await addToSyncQueue(table, 'upsert', itemWithTimestamps);
        setSyncStatus(prev => ({ ...prev, pendingChanges: prev.pendingChanges + 1 }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save data');
      throw err;
    }
  }, [dbStoreName, supabaseTable, isOnline]);

  // Update data
  const updateData = useCallback(async (id: string, updates: Partial<T>, customTable?: string): Promise<void> => {
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

      // Save using saveData which handles sync
      await saveData(updatedItem, customTable);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update data');
      throw err;
    }
  }, [data, saveData]);

  // Delete data
  const deleteData = useCallback(async (id: string, customTable?: string): Promise<void> => {
    try {
      setError(null);

      // Remove from IndexedDB
      await dbDelete(dbStoreName, id);

      // Update local state
      setData(prev => prev.filter(item => item.id !== id));

      // If online, try to sync immediately
      const table = customTable || supabaseTable;
      if (isOnline) {
        try {
          const sb = getSupabaseClient();
          if (sb) {
            const { error } = await sb.from(table).delete().eq('id', id);
            if (error) throw error;
          }
        } catch (syncError) {
          // If sync fails, add to queue
          await addToSyncQueue(table, 'delete', { id });
          setSyncStatus(prev => ({ ...prev, pendingChanges: prev.pendingChanges + 1 }));
        }
      } else {
        // If offline, add to sync queue
        await addToSyncQueue(table, 'delete', { id });
        setSyncStatus(prev => ({ ...prev, pendingChanges: prev.pendingChanges + 1 }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete data');
      throw err;
    }
  }, [dbStoreName, supabaseTable, isOnline]);

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

  // Sync data: Bidirectional sync with Supabase
  const syncData = useCallback(async (customTable?: string): Promise<void> => {
    if (!isOnline) {
      throw new Error('Cannot sync while offline');
    }

    const table = customTable || supabaseTable;
    
    try {
      setError(null);
      setSyncStatus(prev => ({ ...prev, isSyncing: true, error: null }));

      // Perform full bidirectional sync
      await syncTable(table, dbStoreName);

      // Reload data after sync
      await loadData();

      // Update sync status
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: Date.now(),
        error: null
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync data';
      setError(errorMessage);
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: errorMessage
      }));
      throw err;
    }
  }, [isOnline, supabaseTable, dbStoreName, loadData]);

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
    syncData,
    isOnline,
    syncStatus,
    refreshData
  };
}
