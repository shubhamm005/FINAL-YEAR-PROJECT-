import { createClient } from '@supabase/supabase-js';

/**
 * Supabase admin client — uses the SERVICE ROLE KEY.
 * This bypasses ALL Row Level Security policies.
 *
 * ONLY use in server-side Route Handlers or Server Actions — NEVER
 * import this in client components or expose to the browser.
 *
 * Add SUPABASE_SERVICE_ROLE_KEY to .env.local (server-only, no NEXT_PUBLIC_ prefix).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key || key === 'your-service-role-key') {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured in .env.local. ' +
        'Get it from Supabase Dashboard → Project Settings → API → service_role key.'
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
