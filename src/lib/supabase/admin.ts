// src/lib/supabase/admin.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// WARNING: Never expose this client to the browser
// This client is meant for server-side use only, with elevated privileges.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Avoid throwing at import time during builds (e.g., CI without secrets).
// Instead, export a client that lazily errors on first use when not configured.
function createAdminClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase admin client not configured: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

let cachedAdmin: SupabaseClient | null = null;

// The admin client for server-side operations; proxies to a lazily created client.
export const supabaseAdmin = new Proxy({} as unknown as SupabaseClient, {
  get(_target, prop, receiver) {
    if (!cachedAdmin) {
      cachedAdmin = createAdminClient();
    }
  const value: any = (cachedAdmin as unknown as any)[prop as any];
    return typeof value === 'function' ? value.bind(cachedAdmin) : value;
  },
});
