// Enhanced Sync Manager: Bidirectional sync with conflict resolution
import { getSupabaseClient } from './supabaseClient';
import { dbGetAll, dbPut, dbGetById, StoreName } from './indexeddb';

export interface SyncQueueItem {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete' | 'upsert';
  data: any;
  timestamp: number;
  retries: number;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingChanges: number;
  error: string | null;
}

// Sync queue stored in IndexedDB
const SYNC_QUEUE_STORE: StoreName = 'syncQueue';

// Conflict resolution strategy: Last-write-wins using updated_at timestamp
function resolveConflict(local: any, remote: any): any {
  const localTime = new Date(local.updated_at || local.created_at || 0).getTime();
  const remoteTime = new Date(remote.updated_at || remote.created_at || 0).getTime();
  
  // If timestamps are equal, prefer remote (authoritative)
  return remoteTime >= localTime ? remote : local;
}

// Add item to sync queue
export async function addToSyncQueue(
  table: string,
  operation: 'insert' | 'update' | 'delete' | 'upsert',
  data: any
): Promise<void> {
  const queueItem: SyncQueueItem = {
    id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    table,
    operation,
    data,
    timestamp: Date.now(),
    retries: 0
  };

  try {
    await dbPut(SYNC_QUEUE_STORE, queueItem);
  } catch (error) {
    // If syncQueue store doesn't exist, create it by upgrading DB
    console.warn('Sync queue store not found, may need DB upgrade');
    throw error;
  }
}

// Get all pending sync items
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  try {
    return await dbGetAll<SyncQueueItem>(SYNC_QUEUE_STORE);
  } catch (error) {
    // Store might not exist yet, return empty array
    console.warn('[Sync] Sync queue store not available:', error);
    return [];
  }
}

// Remove item from sync queue
export async function removeFromSyncQueue(queueItemId: string): Promise<void> {
  const { dbDelete } = await import('./indexeddb');
  await dbDelete(SYNC_QUEUE_STORE, queueItemId);
}

// Clear sync queue
export async function clearSyncQueue(): Promise<void> {
  const queue = await getSyncQueue();
  const { dbDelete } = await import('./indexeddb');
  for (const item of queue) {
    await dbDelete(SYNC_QUEUE_STORE, item.id);
  }
}

// Sync data DOWN from Supabase to IndexedDB
export async function syncFromSupabase(table: string, storeName: StoreName): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) {
    console.warn(`[Sync] Supabase not available, skipping sync for ${table}`);
    return;
  }

  try {
    // Try with explicit schema first (api), fallback to public if needed
    const { data, error } = await sb.from(table).select('*').order('updated_at', { ascending: false });
    
    if (error) {
      throw error;
    }

    if (!data || data.length === 0) return;

    // Merge with local data using conflict resolution
    let localData: any[] = [];
    try {
      localData = await dbGetAll(storeName);
    } catch (err) {
      // Store might not exist, start fresh
      console.warn(`[Sync] Store ${storeName} not found, will create items`);
    }
    
    const localMap = new Map(localData.map((item: any) => [item.id, item]));
    const now = new Date().toISOString();

    for (const remoteItem of data) {
      // Ensure timestamps exist
      if (!remoteItem.updated_at) remoteItem.updated_at = now;
      if (!remoteItem.created_at) remoteItem.created_at = now;
      
      const localItem = localMap.get(remoteItem.id);
      
      if (localItem) {
        // Resolve conflict if both exist
        const resolved = resolveConflict(localItem, remoteItem);
        await dbPut(storeName, resolved);
      } else {
        // New item from remote
        await dbPut(storeName, remoteItem);
      }
    }

    console.log(`[Sync] Synced ${data.length} items from ${table} to ${storeName}`);
  } catch (error) {
    console.error(`[Sync] Error syncing from ${table}:`, error);
    throw error;
  }
}

// Sync data UP from IndexedDB to Supabase
export async function syncToSupabase(table: string, storeName: StoreName): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) {
    console.warn(`[Sync] Supabase not available, skipping sync for ${table}`);
    return;
  }

  try {
    // Get all local data
    const localData = await dbGetAll(storeName);

    if (localData.length === 0) return;

    // Fetch current remote data to check for conflicts
    const { data: remoteData } = await sb.from(table).select('*');
    const remoteMap = new Map((remoteData || []).map(item => [item.id, item]));

      const updates: any[] = [];
      const now = new Date().toISOString();

    for (const localItem of localData) {
      // Ensure timestamps
      if (!localItem.updated_at) localItem.updated_at = now;
      if (!localItem.created_at) localItem.created_at = now;
      
      const remoteItem = remoteMap.get(localItem.id);

      if (remoteItem) {
        // Check if local is newer or equal (for conflict resolution)
        const localTime = new Date(localItem.updated_at || localItem.created_at || 0).getTime();
        const remoteTime = new Date(remoteItem.updated_at || remoteItem.created_at || 0).getTime();

        if (localTime >= remoteTime) {
          // Local is newer or same, push it
          updates.push(localItem);
        } else {
          // Remote is newer, pull it down instead
          await dbPut(storeName, remoteItem);
        }
      } else {
        // New local item, push it
        updates.push(localItem);
      }
    }

    // Batch upsert to Supabase
    if (updates.length > 0) {
      const mapped = updates.map(item => mapKeysForSupabase(item));
      const filtered = mapped.map(item => filterColumnsForTable(table, item));
      
      const { error } = await sb.from(table).upsert(filtered, { 
        onConflict: 'id',
        returning: 'minimal' as any 
      });

      if (error) throw error;
      console.log(`[Sync] Synced ${updates.length} items from ${storeName} to ${table}`);
    }
  } catch (error) {
    console.error(`[Sync] Error syncing to ${table}:`, error);
    throw error;
  }
}

// Process sync queue (offline changes)
export async function processSyncQueue(): Promise<{ success: number; failed: number }> {
  const sb = getSupabaseClient();
  if (!sb) {
    return { success: 0, failed: 0 };
  }

  const queue = await getSyncQueue();
  if (queue.length === 0) return { success: 0, failed: 0 };

  let success = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const mapped = mapKeysForSupabase(item.data);
      const filtered = filterColumnsForTable(item.table, mapped);

      if (item.operation === 'delete') {
        const { error } = await sb.from(item.table).delete().eq('id', item.data.id || item.data);
        if (error) throw error;
      } else if (item.operation === 'insert' || item.operation === 'update' || item.operation === 'upsert') {
        const { error } = await sb.from(item.table).upsert(filtered, { 
          onConflict: 'id',
          returning: 'minimal' as any 
        });
        if (error) throw error;
      }

      await removeFromSyncQueue(item.id);
      success++;
    } catch (error) {
      console.error(`[Sync] Failed to process queue item ${item.id}:`, error);
      item.retries++;
      
      // Remove from queue if too many retries
      if (item.retries >= 3) {
        await removeFromSyncQueue(item.id);
        failed++;
      } else {
        // Update retry count
        await dbPut(SYNC_QUEUE_STORE, item);
      }
    }
  }

  return { success, failed };
}

// Full bidirectional sync for a table
export async function syncTable(table: string, storeName: StoreName): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;

  try {
    // Step 1: Sync DOWN (Supabase → IndexedDB) first to get latest remote data
    await syncFromSupabase(table, storeName);

    // Step 2: Sync UP (IndexedDB → Supabase) to push local changes
    await syncToSupabase(table, storeName);

    // Step 3: Process sync queue for any pending offline changes
    await processSyncQueue();

    // Step 4: Final sync DOWN to ensure consistency
    await syncFromSupabase(table, storeName);
  } catch (error) {
    console.error(`[Sync] Error in full sync for ${table}:`, error);
    throw error;
  }
}

// Helper: Map camelCase to lowercase keys for Supabase
function mapKeysForSupabase(obj: any): any {
  const out: any = {};
  for (const key of Object.keys(obj)) {
    const lowerFlat = key.replace(/[A-Z]/g, (m) => m.toLowerCase());
    out[lowerFlat] = obj[key];
  }
  return out;
}

// Helper: Filter columns to safe whitelist
const SAFE_COLUMNS: Record<string, string[]> = {
  users: ['id','businessid','ownername','email','mobile','createdat','updated_at'],
  registrations: ['id','ownername','email','mobile','password','businesstype','plan','createdat','updated_at'],
  settings: ['id','data','created_at','createdat','updated_at'],
  categories: ['id','name','description','sortorder','created_at','createdat','updated_at'],
  products: ['id','name','description','price','category','image','available','modifiers','variations','tags','expirydate','stock','lowstockthreshold','created_at','createdat','updated_at'],
  orders: ['id','businessType','customername','customerphone','customeremail','items','subtotal','tax','total','taxrate','paymentmethod','upivid','paymentstatus','timestamp','status','ordertype','tablenumber','address','created_at','createdat','updated_at'],
  medicines: ['id','name','brand','category','batchnumber','expirydate','manufacturingdate','quantity','unitprice','supplier','prescription','activeingredient','dosage','form','lowstockthreshold','created_at','createdat','updated_at'],
  invoices: ['id','invoicenumber','clientname','clientemail','clientaddress','items','subtotal','tax','total','status','issuedate','duedate','notes','createdat','updated_at'],
  expenses: ['id','description','amount','category','date','receipt','notes','createdat','updated_at'],
  employees: ['id','name','email','phone','role','status','employeid','pin','performanceScore','joindate','salary','created_at','createdat','updated_at'],
  attendance: ['id','employeeid','date','checkin','checkout','status','notes','created_at','createdat','updated_at'],
  appointments: ['id','customername','customerphone','customeremail','servicename','serviceid','datetime','duration','status','notes','created_at','createdat','updated_at'],
  services: ['id','name','description','price','duration','category','available','created_at','createdat','updated_at']
};

function filterColumnsForTable(table: string, obj: any): any {
  const allow = SAFE_COLUMNS[table];
  if (!allow) return obj;
  const out: any = {};
  for (const k of allow) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

// Initialize real-time subscriptions for a table
export function subscribeToTable(
  table: string,
  storeName: StoreName,
  onUpdate: (data: any) => void
): () => void {
  const sb = getSupabaseClient();
  if (!sb) {
    return () => {}; // No-op unsubscribe
  }

  const channel = sb
    .channel(`${table}_changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'api', // Updated to use 'api' schema to match Supabase configuration
        table: table,
      },
      async (payload) => {
        try {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newData = payload.new;
            const existing = await dbGetById(storeName, newData.id);
            
            if (existing) {
              const resolved = resolveConflict(existing, newData);
              await dbPut(storeName, resolved);
              onUpdate(resolved);
            } else {
              await dbPut(storeName, newData);
              onUpdate(newData);
            }
          } else if (payload.eventType === 'DELETE') {
            const { dbDelete } = await import('./indexeddb');
            await dbDelete(storeName, payload.old.id);
            onUpdate(null); // Signal deletion
          }
        } catch (error) {
          console.error(`[Sync] Error processing real-time update for ${table}:`, error);
        }
      }
    )
    .subscribe();

  return () => {
    sb.removeChannel(channel);
  };
}

