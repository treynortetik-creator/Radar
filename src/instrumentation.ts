/**
 * Next.js Instrumentation — runs once on server startup
 * Sets up automatic RSS ingestion every 30 minutes
 * Sets up digest scheduler that checks every 60 seconds
 */

export async function register() {
  // Only run on server, not during build
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const INGEST_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
    const DIGEST_CHECK_INTERVAL_MS = 60 * 1000; // 60 seconds

    console.log('[Radar] Starting automatic RSS ingestion scheduler...');

    // Run initial ingestion after 10 seconds (let the server fully start)
    setTimeout(async () => {
      await triggerIngest();
    }, 10_000);

    // Then run every 30 minutes
    setInterval(async () => {
      await triggerIngest();
    }, INGEST_INTERVAL_MS);

    console.log('[Radar] RSS ingestion scheduled: every 30 minutes');

    // Start digest scheduler — checks every 60 seconds
    console.log('[Radar] Starting digest scheduler (60s check interval)...');
    setTimeout(async () => {
      await triggerDigestCheck();
    }, 30_000);
    setInterval(async () => {
      await triggerDigestCheck();
    }, DIGEST_CHECK_INTERVAL_MS);

    console.log('[Radar] Digest scheduler started');
  }
}

function getBaseUrl(): string {
  return process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
}

async function triggerIngest() {
  try {
    const baseUrl = getBaseUrl();

    console.log(`[Radar] Triggering RSS ingestion at ${new Date().toISOString()}...`);

    const res = await fetch(`${baseUrl}/api/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`[Radar] Ingestion complete: ${data.new_items} new items (${data.total_fetched} fetched)`);

      // Log critical/high items
      if (data.results?.critical > 0 || data.results?.high > 0) {
        console.log(`[Radar] Priority items: ${data.results.critical} critical, ${data.results.high} high`);
      }
    } else {
      console.error(`[Radar] Ingestion failed: ${res.status} ${res.statusText}`);
    }
  } catch (error) {
    console.error('[Radar] Ingestion error:', error);
  }
}

async function triggerDigestCheck() {
  try {
    // Dynamic import to avoid build-time issues
    const { supabaseAdmin } = await import('./lib/supabase-admin');

    const { data: configs, error } = await supabaseAdmin
      .from('digest_config')
      .select('*')
      .eq('is_active', true);

    if (error || !configs) return;

    const now = new Date();
    const utcDay = now.getUTCDay();       // 0=Sunday
    const utcHour = now.getUTCHours();
    const utcDayOfMonth = now.getUTCDate();

    for (const config of configs) {
      const type = config.digest_type as string;
      let shouldRun = false;

      if (type === 'weekly') {
        shouldRun = utcDay === config.delivery_day && utcHour === config.delivery_hour;
      } else {
        // monthly, 90day, 180day — check day of month + hour
        shouldRun = utcDayOfMonth === config.delivery_day_of_month && utcHour === config.delivery_hour;
      }

      if (!shouldRun) continue;

      // Idempotency guard: check if digest already exists for this type today
      const todayStr = now.toISOString().split('T')[0];
      const { data: existing } = await supabaseAdmin
        .from('weekly_digests')
        .select('id')
        .eq('digest_type', type)
        .eq('week_end', todayStr)
        .limit(1);

      if (existing && existing.length > 0) {
        continue; // Already generated today
      }

      console.log(`[Radar] Triggering ${type} digest generation...`);

      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}/api/digest/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      if (res.ok) {
        console.log(`[Radar] ${type} digest generated successfully`);
      } else {
        console.error(`[Radar] ${type} digest generation failed: ${res.status}`);
      }
    }
  } catch (error) {
    console.error('[Radar] Digest check error:', error);
  }
}
