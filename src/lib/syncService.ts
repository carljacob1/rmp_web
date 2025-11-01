// Global Sync Service: Handles app-wide sync initialization and periodic syncing
import { getSupabaseClient } from './supabaseClient';
import { syncTable, processSyncQueue, getSyncQueue, subscribeToTable } from './syncManager';
import { StoreName } from './indexeddb';

// Table to store mapping - Comprehensive schema matching supabase_migration_comprehensive.sql
const SYNC_TABLES: Array<{ table: string; store: StoreName }> = [
  // Core tables
  { table: 'users', store: 'users' },
  { table: 'registrations', store: 'registrations' },
  { table: 'business_settings', store: 'business_settings' },
  { table: 'locations', store: 'locations' },
  { table: 'categories', store: 'categories' },
  { table: 'products', store: 'products' },
  { table: 'customers', store: 'customers' },
  { table: 'transactions', store: 'transactions' },
  { table: 'transaction_items', store: 'transaction_items' },
  { table: 'tax_rates', store: 'tax_rates' },
  { table: 'employees', store: 'employees' },
  { table: 'attendance', store: 'attendance' },
  // Restaurant-specific
  { table: 'menu_items', store: 'menu_items' },
  { table: 'modifiers', store: 'modifiers' },
  // Pharmacy-specific
  { table: 'patients', store: 'patients' },
  { table: 'prescriptions', store: 'prescriptions' },
  { table: 'service_categories', store: 'service_categories' },
  // Service business
  { table: 'services', store: 'services' },
  { table: 'appointments', store: 'appointments' },
  // Refilling business
  { table: 'containers', store: 'containers' },
  { table: 'refill_history', store: 'refill_history' },
  // Open items
  { table: 'item_types', store: 'item_types' },
  { table: 'open_items', store: 'open_items' },
  // Multi-business
  { table: 'businesses', store: 'businesses' },
  { table: 'business_types', store: 'business_types' },
  // Barcode management
  { table: 'barcode_settings', store: 'barcode_settings' },
  { table: 'barcode_history', store: 'barcode_history' },
  // Reports
  { table: 'gst_reports', store: 'gst_reports' },
  { table: 'tax_reports', store: 'tax_reports' },
  // Legacy (for backward compatibility during migration)
  { table: 'orders', store: 'orders' },
  { table: 'medicines', store: 'medicines' },
  { table: 'invoices', store: 'invoices' },
  { table: 'expenses', store: 'expenses' },
  { table: 'settings', store: 'settings' },
  { table: 'subscriptions', store: 'subscriptions' },
  { table: 'payments', store: 'payments' }
];

let syncInterval: NodeJS.Timeout | null = null;
let isInitialSyncComplete = false;
const realtimeSubscriptions: Array<() => void> = [];

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
    
    // Setup real-time subscriptions for all tables
    setupRealTimeSubscriptions();
    
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
        
        // Sync critical tables frequently (products, transactions, categories, customers)
        await syncTable('products', 'products');
        await syncTable('transactions', 'transactions');
        await syncTable('categories', 'categories');
        await syncTable('customers', 'customers');
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

// Setup real-time subscriptions for all tables
export function setupRealTimeSubscriptions(): void {
  const sb = getSupabaseClient();
  if (!sb || !navigator.onLine) {
    console.warn('[Sync Service] Cannot setup real-time subscriptions: Supabase not available or offline');
    return;
  }

  // Clean up existing subscriptions
  cleanupRealTimeSubscriptions();

  // Subscribe to all tables
  SYNC_TABLES.forEach(({ table, store }) => {
    try {
      const unsubscribe = subscribeToTable(table, store, (data) => {
        console.log(`[Sync Service] Real-time update received for ${table}:`, data);
        // Data is already updated in IndexedDB by subscribeToTable
        // You can add custom logic here if needed (e.g., update React state)
      });
      realtimeSubscriptions.push(unsubscribe);
      console.log(`[Sync Service] Real-time subscription active for ${table}`);
    } catch (error) {
      console.error(`[Sync Service] Failed to subscribe to ${table}:`, error);
    }
  });

  console.log(`[Sync Service] Real-time subscriptions setup complete for ${realtimeSubscriptions.length} tables`);
}

// Clean up all real-time subscriptions
export function cleanupRealTimeSubscriptions(): void {
  realtimeSubscriptions.forEach(unsubscribe => {
    try {
      unsubscribe();
    } catch (error) {
      console.error('[Sync Service] Error unsubscribing:', error);
    }
  });
  realtimeSubscriptions.length = 0;
}

// Listen for online/offline events and trigger sync
export function setupOnlineSyncListener(): () => void {
  const handleOnline = async () => {
    console.log('[Sync Service] Connection restored, syncing...');
    try {
      // Re-setup real-time subscriptions when coming online
      setupRealTimeSubscriptions();
      
      await syncAllTables();
      updateLastSyncTime();
    } catch (error) {
      console.error('[Sync Service] Sync after reconnect failed:', error);
    }
  };

  const handleOffline = () => {
    console.log('[Sync Service] Connection lost, cleaning up real-time subscriptions');
    cleanupRealTimeSubscriptions();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    cleanupRealTimeSubscriptions();
  };
}

