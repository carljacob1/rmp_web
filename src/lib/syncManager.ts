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

    // Special handling: If syncing users, also fetch passwords from registrations
    let registrationsMap = new Map<string, any>();
    if (table === 'users' && storeName === 'users') {
      try {
        const { data: registrations } = await sb.from('registrations').select('*');
        if (registrations) {
          // Map by email and mobile for easy lookup
          registrations.forEach((reg: any) => {
            if (reg.email) registrationsMap.set(reg.email.toLowerCase(), reg);
            if (reg.mobile) registrationsMap.set(reg.mobile, reg);
          });
          console.log(`[Sync] Loaded ${registrations.length} registrations for password merge`);
        }
      } catch (regError) {
        console.warn('[Sync] Could not load registrations for password merge:', regError);
      }
    }

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
      
      // Normalize column names from Supabase (lowercase/snake_case) to camelCase for local storage
      const normalizedItem = normalizeFromSupabase(remoteItem);
      
      // Merge password from registrations if syncing users
      if (table === 'users' && registrationsMap.size > 0) {
        const userEmail = (normalizedItem.email || '').toLowerCase();
        const userMobile = normalizedItem.mobile || '';
        const registration = registrationsMap.get(userEmail) || registrationsMap.get(userMobile);
        
        if (registration && registration.password) {
          normalizedItem.password = registration.password;
          console.log(`[Sync] Merged password for user ${userEmail || userMobile}`);
        }
      }
      
      const localItem = localMap.get(remoteItem.id);
      
      if (localItem) {
        // Resolve conflict if both exist
        const resolved = resolveConflict(localItem, normalizedItem);
        // Preserve password from local if it exists (might be more recent)
        if (localItem.password && !resolved.password) {
          resolved.password = localItem.password;
        }
        await dbPut(storeName, resolved);
      } else {
        // New item from remote
        await dbPut(storeName, normalizedItem);
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
    let localData = await dbGetAll(storeName);

    if (localData.length === 0) return;
    
    // Normalize local data: ensure keys match what we expect (camelCase for TypeScript)
    // This handles any data that might have been stored with wrong case
    localData = localData.map((item: any) => {
      const normalized: any = {};
      for (const key of Object.keys(item)) {
        // Normalize to camelCase for known fields
        // Handle all possible case variations
        const lowerKey = key.toLowerCase().trim();
        let normalizedKey = key;
        if (lowerKey === 'lowstockthreshold' || lowerKey === 'low_stock_threshold') {
          normalizedKey = 'lowStockThreshold';
        } else if (lowerKey === 'performancescore' || lowerKey === 'performance_score') {
          normalizedKey = 'performanceScore';
        }
        // Avoid duplicates
        if (normalized[normalizedKey] === undefined) {
          normalized[normalizedKey] = item[key];
        }
      }
      return normalized;
    });

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
          // Remote is newer, pull it down instead (normalize first)
          const normalizedRemote = normalizeFromSupabase(remoteItem);
          await dbPut(storeName, normalizedRemote);
        }
      } else {
        // New local item, push it
        updates.push(localItem);
      }
    }

    // Batch upsert to Supabase
    if (updates.length > 0) {
      // Step 1: Convert all keys to lowercase first
      const mapped = updates.map(item => mapKeysForSupabase(item));
      
      // Step 2: Filter to only safe columns (already lowercase)
      const filtered = mapped.map(item => filterColumnsForTable(table, item));
      
      // Step 3: Final pass - rebuild entire object with ONLY lowercase keys
      const verified = filtered.map((item: any) => {
        const finalItem: any = {};
        // Rebuild object - ensure every key is lowercase
        for (const key of Object.keys(item)) {
          // Force to lowercase - handle all variations
          let lowerKey = key.toLowerCase().trim();
          
          // Special handling for threshold - catch ALL variations
          if (lowerKey.includes('threshold') || lowerKey === 'lowstockthreshold') {
            lowerKey = 'lowstockthreshold';
          }
          
          // CRITICAL: Always use lowercase key, log if we see wrong case
          if (key !== key.toLowerCase()) {
            console.warn(`[Sync] Key "${key}" was not lowercase! Converting to "${lowerKey}"`);
          }
          
          // Store with lowercase key
          finalItem[lowerKey] = item[key];
        }
        
        // Validate: check for any uppercase keys (should be impossible)
        const uppercaseKeys = Object.keys(finalItem).filter(k => k !== k.toLowerCase());
        if (uppercaseKeys.length > 0) {
          console.error(`[Sync] CRITICAL ERROR: Found uppercase keys after conversion:`, uppercaseKeys);
          // Force fix them
          const fixed: any = {};
          for (const k of Object.keys(finalItem)) {
            fixed[k.toLowerCase()] = finalItem[k];
          }
          Object.assign(finalItem, fixed);
        }
        
        return finalItem;
      });
      
      // Final validation before sending
      if (verified.length > 0 && table === 'products') {
        const keys = Object.keys(verified[0]);
        const badKeys = keys.filter(k => k !== k.toLowerCase());
        if (badKeys.length > 0) {
          console.error(`[Sync] BEFORE SEND - Found uppercase keys:`, badKeys);
          console.error(`[Sync] All keys:`, keys);
        }
      }
      
      const { error } = await sb.from(table).upsert(verified, { 
        onConflict: 'id',
        returning: 'minimal' as any 
      });

      if (error) {
        console.error(`[Sync] Supabase error for ${table}:`, error);
        if (verified.length > 0) {
          const keys = Object.keys(verified[0]);
          console.error(`[Sync] Sample data keys:`, keys);
          const badKeys = keys.filter(k => k !== k.toLowerCase());
          if (badKeys.length > 0) {
            console.error(`[Sync] PROBLEM: These keys have uppercase:`, badKeys);
          }
        }
        throw error;
      }
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
        // Ensure ALL keys are lowercase - rebuild object completely
        const verified: any = {};
        for (const key of Object.keys(filtered)) {
          let lowerKey = key.toLowerCase().trim();
          
          // Handle all threshold variations
          if (lowerKey.includes('threshold')) {
            lowerKey = 'lowstockthreshold';
          }
          
          // Always use lowercase key
          verified[lowerKey] = filtered[key];
        }
        
        // Final pass - ensure absolutely everything is lowercase
        const finalVerified: any = {};
        for (const key of Object.keys(verified)) {
          finalVerified[key.toLowerCase()] = verified[key];
        }
        Object.assign(verified, finalVerified);
        
        const { error } = await sb.from(item.table).upsert(verified, { 
          onConflict: 'id',
          returning: 'minimal' as any 
        });
        if (error) {
          console.error(`[Sync Queue] Error for ${item.table}:`, error);
          console.error(`[Sync Queue] Keys sent:`, Object.keys(verified));
          throw error;
        }
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
  if (!obj || typeof obj !== 'object') return obj;
  
  const out: any = {};
  for (const key of Object.keys(obj)) {
    // Convert camelCase to all lowercase: lowStockThreshold -> lowstockthreshold
    // IMPORTANT: Force ALL keys to lowercase, no exceptions
    // Handle ALL case variations: Lowstockthreshold, lowStockThreshold, LOWSTOCKTHRESHOLD, LowStockThreshold, etc.
    let lowerFlat = key.toLowerCase().trim();
    
    // Special handling for known problematic keys - normalize all threshold variations
    if (lowerFlat.includes('threshold')) {
      lowerFlat = 'lowstockthreshold';
    }
    
    // Handle timestamp fields - ensure they're proper ISO strings or null
    let value = obj[key];
    
    // Fix timestamp format for attendance checkin/checkout
    if ((lowerFlat === 'checkin' || lowerFlat === 'checkout') && value) {
      // If it's just a time string like "18:42", convert to proper timestamp
      if (typeof value === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
        // It's just a time, create a full timestamp for today with this time
        const today = new Date();
        const [hours, minutes, seconds = '00'] = value.split(':');
        today.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds), 0);
        value = today.toISOString();
      } else if (typeof value === 'string' && !value.includes('T') && !value.includes('Z')) {
        // Try to parse as date and convert to ISO
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          value = date.toISOString();
        }
      }
    }
    
    // Always use lowercase key - overwrite if duplicate (shouldn't happen)
    out[lowerFlat] = value;
  }
  return out;
}

// Helper: Normalize data FROM Supabase (lowercase/snake_case) to camelCase for local storage
function normalizeFromSupabase(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const out: any = {};
  // Common mappings from database to TypeScript (all lowercase to match Supabase)
  const columnMappings: Record<string, string> = {
    'lowstockthreshold': 'lowStockThreshold',
    'low_stock_threshold': 'lowStockThreshold',
    'businessid': 'businessId',
    'ownername': 'ownerName',
    'batchnumber': 'batchNumber',
    'expirydate': 'expiryDate',
    'manufacturingdate': 'manufacturingDate',
    'unitprice': 'unitPrice',
    'activeingredient': 'activeIngredient',
    'customername': 'customerName',
    'customerphone': 'customerPhone',
    'customeremail': 'customerEmail',
    'paymentmethod': 'paymentMethod',
    'paymentstatus': 'paymentStatus',
    'ordertype': 'orderType',
    'tablenumber': 'tableNumber',
    'performancescore': 'performanceScore',
    'checkin': 'checkIn',
    'checkout': 'checkOut',
    'createdat': 'createdAt',
    'updated_at': 'updated_at', // Keep snake_case for timestamps
    'created_at': 'created_at'  // Keep snake_case for timestamps
  };
  
  // Preserve all fields, mapping known ones to camelCase
  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();
    const normalizedKey = columnMappings[lowerKey] || key;
    // Preserve the value as-is
    out[normalizedKey] = obj[key];
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
  orders: ['id','businesstype','customername','customerphone','customeremail','items','subtotal','tax','total','taxrate','paymentmethod','upivid','paymentstatus','timestamp','status','ordertype','tablenumber','address','created_at','createdat','updated_at'],
  medicines: ['id','name','brand','category','batchnumber','expirydate','manufacturingdate','quantity','unitprice','supplier','prescription','activeingredient','dosage','form','lowstockthreshold','created_at','createdat','updated_at'],
  invoices: ['id','invoicenumber','clientname','clientemail','clientaddress','items','subtotal','tax','total','status','issuedate','duedate','notes','createdat','updated_at'],
  expenses: ['id','description','amount','category','date','receipt','notes','createdat','updated_at'],
  employees: ['id','name','email','phone','role','status','employeid','pin','performancescore','joindate','salary','created_at','createdat','updated_at'],
  attendance: ['id','employeeid','date','checkin','checkout','status','notes','created_at','createdat','updated_at'],
  appointments: ['id','customername','customerphone','customeremail','servicename','serviceid','datetime','duration','status','notes','created_at','createdat','updated_at'],
  services: ['id','name','description','price','duration','category','available','created_at','createdat','updated_at']
};

function filterColumnsForTable(table: string, obj: any): any {
  const allow = SAFE_COLUMNS[table];
  if (!allow) return obj;
  const out: any = {};
  
  // Create case-insensitive lookup map for input keys
  const inputKeyMap = new Map<string, string>();
  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase().trim();
    // Store the original key, but ensure we map all variations correctly
    if (!inputKeyMap.has(lowerKey)) {
      inputKeyMap.set(lowerKey, key);
    }
  }
  
  // Only use columns from SAFE_COLUMNS (which are all lowercase to match database)
  // Match input keys case-insensitively and ALWAYS use the exact lowercase column name from SAFE_COLUMNS
  for (const dbColumnName of allow) {
    const lowerDbName = dbColumnName.toLowerCase().trim();
    // Handle special case for lowstockthreshold variations
    let lookupKey = lowerDbName;
    if (lowerDbName === 'lowstockthreshold') {
      // Try multiple variations - find any threshold key
      let inputKey: string | undefined;
      
      // Try exact matches first
      inputKey = inputKeyMap.get('lowstockthreshold') || 
                 inputKeyMap.get('low_stock_threshold');
      
      // If not found, search for any key containing 'threshold'
      if (!inputKey) {
        for (const [lower, original] of inputKeyMap.entries()) {
          if (lower.includes('threshold')) {
            inputKey = original;
            console.warn(`[Sync] Found threshold key variation: "${original}" -> "lowstockthreshold"`);
            break;
          }
        }
      }
      
      if (inputKey !== undefined) {
        // CRITICAL: Always use lowercase 'lowstockthreshold' as output key
        out['lowstockthreshold'] = obj[inputKey];
      }
    } else {
      const inputKey = inputKeyMap.get(lowerDbName);
      if (inputKey !== undefined) {
        // CRITICAL: ALWAYS use the exact lowercase column name from SAFE_COLUMNS
        out[dbColumnName] = obj[inputKey];
      }
    }
  }
  
  // Final safety check: rebuild with ALL lowercase keys
  const verified: any = {};
  for (const key of Object.keys(out)) {
    const verifiedKey = key.toLowerCase();
    if (key !== verifiedKey) {
      console.error(`[Sync] CRITICAL: filterColumnsForTable output had uppercase key "${key}"! Converting to "${verifiedKey}"`);
    }
    verified[verifiedKey] = out[key];
  }
  
  return verified;
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

