import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined;

if (url && anonKey) {
  // Schema configuration:
  // - Use 'api' if your Supabase only exposes 'api' schema (requires moving tables to api schema)
  // - Use 'public' if your Supabase exposes 'public' schema (default, easier)
  // Current: Using 'api' - If you get PGRST205 errors, either:
  //   1. Run SUPABASE_SCHEMA_FIX.sql to move tables to 'api' schema, OR
  //   2. Change to 'public' and expose 'public' schema in Supabase Dashboard
  supabase = createClient(url, anonKey, {
    auth: { persistSession: true },
    global: { headers: { 'x-client-info': 'pos-web' } },
    db: { schema: 'api' } // Change to 'public' if you expose public schema instead
  });
} else {
  // eslint-disable-next-line no-console
  console.warn('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY). Supabase features are disabled.');
}

export function getSupabaseClient(): SupabaseClient | null {
  return supabase;
}


