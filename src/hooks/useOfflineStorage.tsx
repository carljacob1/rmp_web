import { useState, useEffect, useCallback } from 'react';
// Online-only mode: disable local persistence

interface OfflineStorageHook<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  saveData: (item: T) => Promise<void>;
  updateData: (id: string, item: Partial<T>) => Promise<void>;
  deleteData: (id: string) => Promise<void>;
  clearData: () => Promise<void>;
  syncData: () => Promise<void>;
  isOnline: boolean;
}

export function useOfflineStorage<T extends { id: string }>(
  storeName: string,
  localStorageKey: string
): OfflineStorageHook<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // No persistence: keep in-memory only

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Online-only: start empty; callers should use Supabase APIs for real data
      setData([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [storeName, localStorageKey]);

  const saveData = useCallback(async (item: T): Promise<void> => {
    try {
      setError(null);
      
      // Add to local state
      setData(prev => [...prev, item]);
      
      // No persistence
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save data');
      throw err;
    }
  }, [storeName]);

  const updateData = useCallback(async (id: string, updates: Partial<T>): Promise<void> => {
    try {
      setError(null);
      
      setData(prev => prev.map(item => 
        item.id === id ? { ...item, ...updates } : item
      ));
      
      // No persistence
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update data');
      throw err;
    }
  }, [data, storeName]);

  const deleteData = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      
      setData(prev => prev.filter(item => item.id !== id));
      
      // Note: IndexedDB doesn't have a direct delete by ID in our utility
      // In a real implementation, you'd add a deleteFromIndexedDB function
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete data');
      throw err;
    }
  }, []);

  const clearData = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      setData([]);
      // No persistence
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear data');
      throw err;
    }
  }, [storeName, localStorageKey]);

  const syncData = useCallback(async (): Promise<void> => {
    if (!isOnline) {
      throw new Error('Cannot sync while offline');
    }
    
    try {
      setError(null);
      
      // No-op: callers should write to Supabase directly elsewhere
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync data');
      throw err;
    }
  }, [isOnline, loadData]);

  return {
    data,
    loading,
    error,
    saveData,
    updateData,
    deleteData,
    clearData,
    syncData,
    isOnline
  };
}