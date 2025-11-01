import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined;

if (url && anonKey) {
  // Schema configuration:
  // - Using 'api' schema - tables are created in api schema for API access
  supabase = createClient(url, anonKey, {
    auth: { persistSession: true },
    global: { headers: { 'x-client-info': 'pos-web' } },
    db: { schema: 'api' } // API schema - matches supabase_migration_api.sql
  });
} else {
  // eslint-disable-next-line no-console
  console.warn('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY). Supabase features are disabled.');
}

export function getSupabaseClient(): SupabaseClient | null {
  return supabase;
}


