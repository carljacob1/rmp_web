import { getSupabaseClient } from './supabaseClient';
import { dbPut } from './indexeddb';

type AnyRecord = Record<string, any>;

export async function fetchAll<T = AnyRecord>(table: string): Promise<T[]> {
  const sb = getSupabaseClient();
  if (!sb) return [];
  const { data, error } = await sb.from(table).select('*');
  if (error) throw error;
  return (data || []) as T[];
}

export async function upsertOne(table: string, row: AnyRecord): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  const mapped = filterColumnsForTable(table, mapKeysForSupabase(row));
  const { error } = await sb.from(table).upsert(mapped, { onConflict: 'id', returning: 'minimal' as any });
  if (error) throw error;
}

export async function deleteOne(table: string, id: string): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  const { error } = await sb.from(table).delete().eq('id', id);
  if (error) throw error;
}

// Convenience helpers for domain tables
export async function syncCategoriesToLocal(): Promise<void> {
  const rows = await fetchAll('categories');
  for (const row of rows) await dbPut('categories', row);
}

export async function syncProductsToLocal(): Promise<void> {
  const rows = await fetchAll('products');
  for (const row of rows) await dbPut('products', row);
}

export async function syncOrdersToLocal(): Promise<void> {
  const rows = await fetchAll('orders');
  for (const row of rows) await dbPut('orders', row);
}


// Push local IndexedDB data up to Supabase on boot (one-time bootstrap)
// Convert camelCase keys to the lowercase style seen in your Supabase UI
// e.g. businessId -> businessid, ownerName -> ownername
function mapKeysForSupabase<T extends AnyRecord>(obj: T): AnyRecord {
  const out: AnyRecord = {};
  for (const key of Object.keys(obj)) {
    const lowerFlat = key.replace(/[A-Z]/g, (m) => m.toLowerCase());
    out[lowerFlat] = (obj as AnyRecord)[key];
  }
  return out;
}

// Whitelist minimal, safe columns to avoid PostgREST 406 when some columns don't exist yet
const SAFE_COLUMNS: Record<string, string[]> = {
  users: ['id','businessid','ownername','email','mobile','createdat','updated_at'],
  registrations: ['id','ownername','email','mobile','password','businesstype','plan','createdat','updated_at'],
  settings: ['id','data','created_at','createdat','updated_at'],
  categories: ['id','name','description','sortorder','created_at','createdat','updated_at'],
  products: ['id','name','description','price','category','image','available','modifiers','variations','tags','expirydate','stock','lowstockthreshold','created_at','createdat','updated_at'],
  orders: ['id','businesstype','customername','customerphone','customeremail','items','subtotal','tax','total','taxrate','paymentmethod','upivid','paymentstatus','timestamp','status','ordertype','tablenumber','address','created_at','createdat','updated_at'],
  medicines: ['id','name','brand','category','batchnumber','expirydate','manufacturingdate','quantity','unitprice','supplier','prescription','activeingredient','dosage','form','lowstockthreshold','created_at','createdat','updated_at'],
  invoices: ['id','invoicenumber','clientname','clientemail','clientaddress','items','subtotal','tax','total','status','issuedate','duedate','notes','createdat','updated_at'],
  expenses: ['id','description','amount','category','date','receipt','notes','createdat','updated_at']
};

function filterColumnsForTable(table: string, obj: AnyRecord): AnyRecord {
  const allow = SAFE_COLUMNS[table];
  if (!allow) return obj; // unknown table: pass-through
  const out: AnyRecord = {};
  
  // Create case-insensitive lookup map for input keys
  const inputKeyMap = new Map<string, string>();
  for (const key of Object.keys(obj)) {
    inputKeyMap.set(key.toLowerCase(), key); // Map lowercase -> original key in input
  }
  
  // Only use columns from SAFE_COLUMNS (which are all lowercase to match database)
  // Match input keys case-insensitively and use the exact database column name from SAFE_COLUMNS
  for (const dbColumnName of allow) {
    const inputKey = inputKeyMap.get(dbColumnName.toLowerCase());
    if (inputKey !== undefined) {
      // Use the exact lowercase column name from SAFE_COLUMNS (matches database)
      out[dbColumnName] = obj[inputKey];
    }
  }
  return out;
}


