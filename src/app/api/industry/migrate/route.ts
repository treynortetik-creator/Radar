import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { scoreIndustryItem, loadIndustryContext } from '@/lib/industry-scoring';

export const maxDuration = 300; // 5 minutes for batch rescoring

const BATCH_SIZE = 50;

export async function POST() {
  try {
    // -----------------------------------------------------------------------
    // 1. Load config
    // -----------------------------------------------------------------------
    const { data: configData } = await supabaseAdmin
      .from('admin_config')
      .select('key, value');

    const config: Record<string, string> = {};
    for (const row of configData || []) {
      config[row.key] = row.value;
    }

    const model =
      config.industry_openrouter_model ||
      config.openrouter_model ||
      'google/gemini-2.0-flash-001';
    const apiKey = process.env.OPENROUTER_API_KEY || '';

    // -----------------------------------------------------------------------
    // 2. Load industry context
    // -----------------------------------------------------------------------
    const industryContext = loadIndustryContext();

    // -----------------------------------------------------------------------
    // 3. Query competitor_events for recent industry_news items (last 10 days)
    // -----------------------------------------------------------------------
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const cutoffISO = tenDaysAgo.toISOString();

    const { data: recentItems, error: fetchError } = await supabaseAdmin
      .from('competitor_events')
      .select('id, url_hash, title, url, summary, published_at, feed_name')
      .eq('category', 'industry_news')
      .gte('published_at', cutoffISO)
      .order('published_at', { ascending: false });

    if (fetchError) throw fetchError;

    const found = recentItems?.length || 0;
    console.log(`[migrate] Found ${found} recent industry_news items in competitor_events`);

    if (found === 0) {
      // Still clean up old items even if nothing recent to migrate
      const oldCleaned = await cleanupOldIndustryItems(cutoffISO);
      return NextResponse.json({
        success: true,
        found: 0,
        already_in_industry_news: 0,
        migrated: 0,
        failed: 0,
        old_cleaned_up: oldCleaned,
      });
    }

    // -----------------------------------------------------------------------
    // 4. Batch-check which url_hashes already exist in industry_news
    // -----------------------------------------------------------------------
    const allHashes = recentItems!.map((item) => item.url_hash);
    const existingHashes = new Set<string>();

    for (let i = 0; i < allHashes.length; i += BATCH_SIZE) {
      const batch = allHashes.slice(i, i + BATCH_SIZE);
      const { data: existing } = await supabaseAdmin
        .from('industry_news')
        .select('url_hash')
        .in('url_hash', batch);

      if (existing) {
        for (const row of existing) {
          existingHashes.add(row.url_hash);
        }
      }
    }

    const alreadyExists = existingHashes.size;
    const toMigrate = recentItems!.filter(
      (item) => !existingHashes.has(item.url_hash),
    );

    console.log(
      `[migrate] ${alreadyExists} already in industry_news, ${toMigrate.length} to migrate`,
    );

    // -----------------------------------------------------------------------
    // 5. Score and insert each new item
    // -----------------------------------------------------------------------
    let migrated = 0;
    let failed = 0;
    const migratedIds: number[] = [];

    for (const item of toMigrate) {
      try {
        const scores = await scoreIndustryItem(
          {
            title: item.title,
            url: item.url,
            summary: item.summary,
            published_at: item.published_at,
            source_name: item.feed_name,
          },
          industryContext,
          model,
          apiKey,
        );

        // 300ms rate limit between scoring calls
        await new Promise((resolve) => setTimeout(resolve, 300));

        const { error: insertError } = await supabaseAdmin
          .from('industry_news')
          .insert({
            url_hash: item.url_hash,
            title: item.title,
            url: item.url,
            summary: item.summary,
            published_at: item.published_at,
            source_name: item.feed_name,
            relevance_tier: scores.relevance_tier,
            relevance_summary: scores.relevance_summary,
            topics: scores.topics,
            mentioned_accounts: scores.mentioned_accounts,
          });

        if (insertError) {
          console.error(
            `[migrate] Insert failed for "${item.title?.slice(0, 50)}":`,
            insertError,
          );
          failed++;
        } else {
          migrated++;
          migratedIds.push(item.id);
          console.log(
            `[migrate] Migrated ${migrated}/${toMigrate.length}: ${item.title?.slice(0, 50)}...`,
          );
        }
      } catch (err) {
        console.error(
          `[migrate] Error processing "${item.title?.slice(0, 50)}":`,
          err,
        );
        failed++;
      }
    }

    // -----------------------------------------------------------------------
    // 6. Batch-delete migrated items from competitor_events
    // -----------------------------------------------------------------------
    for (let i = 0; i < migratedIds.length; i += BATCH_SIZE) {
      const batch = migratedIds.slice(i, i + BATCH_SIZE);
      const { error: deleteError } = await supabaseAdmin
        .from('competitor_events')
        .delete()
        .in('id', batch);

      if (deleteError) {
        console.error('[migrate] Batch delete error:', deleteError);
      }
    }

    // -----------------------------------------------------------------------
    // 7. Clean up old industry items (> 10 days) from competitor_events
    // -----------------------------------------------------------------------
    const oldCleaned = await cleanupOldIndustryItems(cutoffISO);

    console.log(
      `[migrate] Complete: found=${found} already=${alreadyExists} migrated=${migrated} failed=${failed} old_cleaned=${oldCleaned}`,
    );

    return NextResponse.json({
      success: true,
      found,
      already_in_industry_news: alreadyExists,
      migrated,
      failed,
      old_cleaned_up: oldCleaned,
    });
  } catch (error) {
    console.error('[migrate] Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Helper: delete stale industry_news items from competitor_events
// ---------------------------------------------------------------------------
async function cleanupOldIndustryItems(cutoffISO: string): Promise<number> {
  try {
    // First count how many we'll delete
    const { data: oldItems, error: countError } = await supabaseAdmin
      .from('competitor_events')
      .select('id')
      .eq('category', 'industry_news')
      .lt('published_at', cutoffISO);

    if (countError || !oldItems?.length) return 0;

    const oldIds = oldItems.map((item) => item.id);
    let deleted = 0;

    for (let i = 0; i < oldIds.length; i += BATCH_SIZE) {
      const batch = oldIds.slice(i, i + BATCH_SIZE);
      const { error: deleteError } = await supabaseAdmin
        .from('competitor_events')
        .delete()
        .in('id', batch);

      if (deleteError) {
        console.error('[migrate] Old item cleanup error:', deleteError);
      } else {
        deleted += batch.length;
      }
    }

    if (deleted > 0) {
      console.log(`[migrate] Cleaned up ${deleted} stale industry items (older than 10 days)`);
    }

    return deleted;
  } catch (err) {
    console.error('[migrate] Cleanup error:', err);
    return 0;
  }
}
