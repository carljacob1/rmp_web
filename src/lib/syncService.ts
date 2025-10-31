// Global Sync Service: Handles app-wide sync initialization and periodic syncing
import { getSupabaseClient } from './supabaseClient';
import { syncTable, processSyncQueue, getSyncQueue } from './syncManager';
import { StoreName } from './indexeddb';

// Table to store mapping
const SYNC_TABLES: Array<{ table: string; store: StoreName }> = [
  { table: 'categories', store: 'categories' },
  { table: 'products', store: 'products' },
  { table: 'orders', store: 'orders' },
  { table: 'employees', store: 'employees' },
  { table: 'attendance', store: 'attendance' },
  { table: 'appointments', store: 'appointments' },
  { table: 'services', store: 'services' },
  { table: 'medicines', store: 'medicines' },
  { table: 'invoices', store: 'invoices' },
  { table: 'expenses', store: 'expenses' },
  { table: 'settings', store: 'settings' },
  { table: 'users', store: 'users' },
  { table: 'registrations', store: 'registrations' }
];

let syncInterval: NodeJS.Timeout | null = null;
let isInitialSyncComplete = false;

// Initialize sync: Perform initial sync when app loads
export async function initializeSync(): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) {
    console.warn('[Sync Service] Supabase not available, sync disabled');
    return;
  }

  if (!navigator.onLine) {
    console.log('[Sync Service] Offline, skipping initial sync');
    return;
  }

  try {
    console.log('[Sync Service] Starting initial sync...');
    
    // Sync all tables
    await syncAllTables();
    
    isInitialSyncComplete = true;
    console.log('[Sync Service] Initial sync complete');
    updateLastSyncTime();
    
    // Start periodic sync
    startPeriodicSync();
  } catch (error) {
    console.error('[Sync Service] Initial sync failed:', error);
  }
}

// Sync all configured tables
export async function syncAllTables(): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb || !navigator.onLine) {
    return;
  }

  try {
    // Process sync queue first (offline changes)
    await processSyncQueue();

    // Sync each table
    for (const { table, store } of SYNC_TABLES) {
      try {
        await syncTable(table, store);
      } catch (error) {
        console.error(`[Sync Service] Failed to sync ${table}:`, error);
        // Continue with other tables even if one fails
      }
    }
  } catch (error) {
    console.error('[Sync Service] Error in syncAllTables:', error);
    throw error;
  }
}

// Start periodic background sync (every 30 seconds when online)
export function startPeriodicSync(intervalMs: number = 30000): void {
  if (syncInterval) {
    stopPeriodicSync();
  }

  syncInterval = setInterval(async () => {
    if (navigator.onLine) {
      try {
        // Quick sync: process queue and sync critical tables
        await processSyncQueue();
        
        // Sync critical tables frequently (products, orders, categories)
        await syncTable('products', 'products');
        await syncTable('orders', 'orders');
        await syncTable('categories', 'categories');
      } catch (error) {
        console.error('[Sync Service] Periodic sync error:', error);
      }
    }
  }, intervalMs);
}

// Stop periodic sync
export function stopPeriodicSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

// Manual sync trigger
export async function triggerSync(): Promise<{ success: boolean; error?: string }> {
  if (!navigator.onLine) {
    return { success: false, error: 'Offline' };
  }

  try {
    await syncAllTables();
    updateLastSyncTime();
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

// Get sync status
export async function getSyncStatus(): Promise<{
  isOnline: boolean;
  pendingChanges: number;
  lastSyncTime: number | null;
}> {
  const queue = await getSyncQueue();
  const lastSyncTime = localStorage.getItem('lastSyncTime');
  
  return {
    isOnline: navigator.onLine,
    pendingChanges: queue.length,
    lastSyncTime: lastSyncTime ? parseInt(lastSyncTime, 10) : null
  };
}

// Update last sync time
export function updateLastSyncTime(): void {
  localStorage.setItem('lastSyncTime', Date.now().toString());
}

// Listen for online/offline events and trigger sync
export function setupOnlineSyncListener(): () => void {
  const handleOnline = async () => {
    console.log('[Sync Service] Connection restored, syncing...');
    try {
      await syncAllTables();
      updateLastSyncTime();
    } catch (error) {
      console.error('[Sync Service] Sync after reconnect failed:', error);
    }
  };

  window.addEventListener('online', handleOnline);

  return () => {
    window.removeEventListener('online', handleOnline);
  };
}

