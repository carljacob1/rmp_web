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
  users: ['id','businessid','ownername','email','mobile','createdat'],
  registrations: ['id','ownername','email','mobile','password','businesstype','plan','createdat'],
  settings: ['id','data','created_at','createdat'],
  categories: ['id','name','description','sortorder','created_at','createdat'],
  products: ['id','name','description','price','category','image','available','modifiers','variations','tags','expirydate','created_at','createdat'],
  orders: ['id','customername','customerphone','items','total','ordertime','status','ordertype','tablenumber','address','created_at','createdat'],
  medicines: ['id','name','brand','category','batchnumber','expirydate','manufacturingdate','quantity','unitprice','supplier','prescription','activeingredient','dosage','form','lowstockthreshold','created_at','createdat'],
  invoices: ['id','invoicenumber','clientname','clientemail','clientaddress','items','subtotal','tax','total','status','issuedate','duedate','notes','createdat','updated_at'],
  expenses: ['id','description','amount','category','date','receipt','notes','createdat','updated_at']
};

function filterColumnsForTable(table: string, obj: AnyRecord): AnyRecord {
  const allow = SAFE_COLUMNS[table];
  if (!allow) return obj; // unknown table: pass-through
  const out: AnyRecord = {};
  for (const k of allow) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}


