import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables at startup
if (!supabaseUrl || !supabaseAnonKey) {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  console.error(
    `[Supabase] Missing required environment variables: ${missing.join(', ')}\n` +
    `Please set these in your .env.local file or environment.`
  );
  
  // In development, throw to fail fast. In production, create a stub client.
  if (process.env.NODE_ENV === 'development') {
    throw new Error(`Missing Supabase config: ${missing.join(', ')}`);
  }
}

// Create client only if properly configured
export const supabase: SupabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (new Proxy({} as SupabaseClient, {
      get: (_, prop) => {
        if (prop === 'from' || prop === 'rpc' || prop === 'auth') {
          return () => {
            console.error('[Supabase] Client not configured - missing env vars');
            return { data: null, error: new Error('Supabase not configured') };
          };
        }
        return undefined;
      }
    }));

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
