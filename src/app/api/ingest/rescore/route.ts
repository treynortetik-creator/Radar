import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { scoreIndustryItem, loadIndustryContext } from '@/lib/industry-scoring';

export const maxDuration = 300;

export async function POST() {
  try {
    // Load config
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

    // Load industry context
    const industryContext = loadIndustryContext();

    // Find industry_news items with Background relevance
    const { data: items, error } = await supabaseAdmin
      .from('industry_news')
      .select('id, title, url, summary, published_at, source_name')
      .eq('relevance_tier', 'Background')
      .order('published_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    if (!items?.length) {
      return NextResponse.json({
        success: true,
        rescored: 0,
        message: 'No Background-tier industry items found',
      });
    }

    console.log(`[Radar] Rescoring ${items.length} industry news items...`);

    let rescored = 0;
    for (const item of items) {
      try {
        const scores = await scoreIndustryItem(
          {
            title: item.title || '',
            url: item.url || '',
            summary: item.summary || '',
            published_at: item.published_at || '',
            source_name: item.source_name || '',
          },
          industryContext,
          model,
          apiKey,
        );

        await supabaseAdmin
          .from('industry_news')
          .update({
            relevance_tier: scores.relevance_tier,
            relevance_summary: scores.relevance_summary,
            topics: scores.topics,
            mentioned_accounts: scores.mentioned_accounts,
          })
          .eq('id', item.id);

        rescored++;
        console.log(
          `[Radar] Rescored ${rescored}/${items.length}: ${(item.title || '').slice(0, 40)}...`,
        );

        // Rate limit
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (err) {
        console.error(`[Radar] Error rescoring item ${item.id}:`, err);
        continue;
      }
    }

    console.log(`[Radar] Rescore complete: ${rescored}/${items.length} items updated`);
    return NextResponse.json({ success: true, rescored, total_found: items.length });
  } catch (error) {
    console.error('[Radar] Rescore error:', error);
    return NextResponse.json({ error: 'Rescore failed' }, { status: 500 });
  }
}
