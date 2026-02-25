import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key (bypasses RLS)
// Use this for API routes that need to insert/update data

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate at runtime, not build time
if (!supabaseUrl || !serviceRoleKey) {
  console.warn('[Supabase Admin] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// Create client only if properly configured, otherwise create a stub
export const supabaseAdmin: SupabaseClient = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : (new Proxy({} as SupabaseClient, {
      get: (_, prop) => {
        if (prop === 'from' || prop === 'rpc' || prop === 'auth') {
          return () => {
            console.error('[Supabase Admin] Client not configured - missing env vars');
            return { 
              select: () => ({ data: null, error: new Error('Supabase Admin not configured') }),
              insert: () => ({ data: null, error: new Error('Supabase Admin not configured') }),
              update: () => ({ data: null, error: new Error('Supabase Admin not configured') }),
              upsert: () => ({ data: null, error: new Error('Supabase Admin not configured') }),
              delete: () => ({ data: null, error: new Error('Supabase Admin not configured') }),
              data: null, 
              error: new Error('Supabase Admin not configured') 
            };
          };
        }
        return undefined;
      }
    }));

export const isSupabaseAdminConfigured = Boolean(supabaseUrl && serviceRoleKey);
