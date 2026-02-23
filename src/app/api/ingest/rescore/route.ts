import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

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

    const industryPrompt = config.industry_system_prompt;
    const industryModel = config.industry_openrouter_model || config.openrouter_model || 'google/gemini-2.0-flash-001';
    const masterContext = config.master_context || '';
    const apiKey = process.env.OPENROUTER_API_KEY || '';

    if (!industryPrompt) {
      return NextResponse.json(
        { error: 'No industry system prompt configured. Set it in the Industry News tab first.' },
        { status: 400 },
      );
    }

    // Find industry items with default scores
    const { data: items, error } = await supabaseAdmin
      .from('competitor_events')
      .select('id, title, url, summary, published_at, competitor_id, feed_name, is_job_board, category')
      .eq('category', 'industry_news')
      .eq('priority_tier', 'Low')
      .like('key_takeaway', 'Industry news:%')
      .order('published_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    if (!items?.length) {
      return NextResponse.json({ success: true, rescored: 0, message: 'No unscored industry items found' });
    }

    console.log(`[Radar] Rescoring ${items.length} industry news items...`);

    // Re-score each item
    let rescored = 0;
    for (const item of items) {
      // Build prompt with placeholders
      let prompt = industryPrompt
        .replace(/\{title\}/g, item.title || '')
        .replace(/\{summary\}/g, (item.summary || '').slice(0, 1500))
        .replace(/\{date\}/g, item.published_at || '')
        .replace(/\{competitor\}/g, 'N/A')
        .replace(/\{is_job\}/g, 'No');

      if (masterContext) {
        prompt = `## Company Context\n${masterContext}\n\n## Item to Analyze\n${prompt}`;
      }

      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: industryModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 500,
          }),
        });

        if (!res.ok) {
          console.error(`[Radar] OpenRouter error for item ${item.id}: ${res.status}`);
          continue;
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*?\}/);
        if (!jsonMatch) {
          console.warn(`[Radar] No JSON in response for item ${item.id}`);
          continue;
        }

        const scores = JSON.parse(jsonMatch[0]);

        const threat = Math.max(1, Math.min(3, parseInt(scores.threat_level) || 1));
        const relevance = Math.max(1, Math.min(3, parseInt(scores.strategic_relevance) || 1));
        const weight = Math.max(1, Math.min(3, parseInt(scores.content_type_weight) || 1));
        const priorityScore = Math.round(((threat + relevance + weight) / 3) * 10) / 10;

        let priorityTier = 'Low';
        if (scores.auto_flag_triggers?.trim()) priorityTier = 'Critical';
        else if (priorityScore > 2.6) priorityTier = 'Critical';
        else if (priorityScore >= 2.3) priorityTier = 'High';
        else if (priorityScore > 1.6) priorityTier = 'Medium';

        // Validate theme
        const validThemes = [
          'Regulation/Policy', 'Market Trend', 'Technology/Innovation',
          'M&A/Partnership', 'Workforce/Staffing', 'Resident Safety',
          'Funding/Investment', 'Research/Data', 'Industry Event', 'Thought Leadership',
        ];
        const theme = validThemes.includes(scores.theme) ? scores.theme : 'Thought Leadership';

        // Validate route_to
        const validRoutes = ['Marketing', 'Product', 'Sales Enablement', 'Leadership', 'Monitor Only'];
        const route = validRoutes.includes(scores.route_to) ? scores.route_to : 'Monitor Only';

        await supabaseAdmin
          .from('competitor_events')
          .update({
            theme,
            threat_level: threat,
            strategic_relevance: relevance,
            content_type_weight: weight,
            priority_score: priorityScore,
            priority_tier: priorityTier,
            route_to: route,
            key_takeaway: (scores.key_takeaway || '').slice(0, 500),
            auto_flag_triggers: (scores.auto_flag_triggers || '').slice(0, 500),
          })
          .eq('id', item.id);

        rescored++;
        console.log(`[Radar] Rescored ${rescored}/${items.length}: ${item.title?.slice(0, 40)}...`);

        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 300));
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
