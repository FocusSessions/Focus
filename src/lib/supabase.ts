import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Lazy singleton — Supabase SDK throws if url is empty string at construction time.
// During SSG / build, env vars may not be set, so we defer creation to first use.
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a dummy client that will no-op on all operations.
    // This allows the build to succeed and guest mode to work without Supabase.
    _client = createClient('https://placeholder.supabase.co', 'placeholder-key');
    return _client;
  }

  _client = createClient(supabaseUrl, supabaseAnonKey);
  return _client;
}

// Proxy object that lazily initializes the client on first property access
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
