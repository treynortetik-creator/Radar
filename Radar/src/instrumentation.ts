/**
 * Next.js Instrumentation — runs once on server startup
 * Sets up automatic RSS ingestion every 30 minutes
 */

export async function register() {
  // Only run on server, not during build
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const INGEST_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
    
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
  }
}

async function triggerIngest() {
  try {
    const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';
    
    console.log(`[Radar] Triggering RSS ingestion at ${new Date().toISOString()}...`);
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (process.env.INGEST_API_SECRET) {
      headers['Authorization'] = `Bearer ${process.env.INGEST_API_SECRET}`;
    }

    const res = await fetch(`${baseUrl}/api/ingest`, {
      method: 'POST',
      headers,
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log(`[Radar] Ingestion complete: ${data.new_items} new items (${data.total_fetched} fetched)`);
      
      // Log critical/high items
      if (data.results?.critical > 0 || data.results?.high > 0) {
        console.log(`[Radar] ⚠️ Priority items: ${data.results.critical} critical, ${data.results.high} high`);
      }
    } else {
      console.error(`[Radar] Ingestion failed: ${res.status} ${res.statusText}`);
    }
  } catch (error) {
    console.error('[Radar] Ingestion error:', error);
  }
}
