import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

/**
 * Server-side auth helper for API routes.
 * Validates the user's session from the request cookies.
 * Returns the authenticated user or null.
 */
export async function getServerUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  // Find the Supabase auth token from cookies
  // Supabase stores session in sb-<ref>-auth-token cookies
  const authCookies = allCookies.filter(c =>
    c.name.includes('auth-token')
  );

  if (authCookies.length === 0) return null;

  // Reconstruct the session token
  // Supabase may chunk cookies, so we need to reassemble them
  const sortedCookies = authCookies.sort((a, b) => a.name.localeCompare(b.name));
  const tokenValue = sortedCookies.map(c => c.value).join('');

  if (!tokenValue) return null;

  try {
    // Parse the base64-encoded session
    const parsed = JSON.parse(tokenValue);
    const accessToken = parsed?.access_token || parsed?.[0]?.access_token;

    if (!accessToken) return null;

    // Create a temporary client with the user's access token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) return null;

    return user;
  } catch {
    return null;
  }
}

/**
 * Validates the ingest API secret for internal/cron calls.
 * Set INGEST_API_SECRET env var to enable protection.
 */
export function validateIngestSecret(request: Request): boolean {
  const secret = process.env.INGEST_API_SECRET;

  // If no secret is configured, allow (but log warning)
  if (!secret) {
    console.warn('[Security] INGEST_API_SECRET not set — ingest endpoint is unprotected');
    return true;
  }

  const authHeader = request.headers.get('Authorization');
  if (authHeader === `Bearer ${secret}`) return true;

  const url = new URL(request.url);
  if (url.searchParams.get('secret') === secret) return true;

  return false;
}

/**
 * Returns a 401 JSON response
 */
export function unauthorizedResponse(message = 'Authentication required') {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
