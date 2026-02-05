import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

interface FeedItem {
  title: string;
  url: string;
  summary: string;
  date: string;
  competitor_id: number;
  competitor_name: string;
  feed_name: string;
  is_job_board: boolean;
  url_hash: string;
}

interface AIScores {
  theme: string;
  threat_level: number;
  strategic_relevance: number;
  content_type_weight: number;
  priority_score: number;
  priority_tier: string;
  route_to: string;
  key_takeaway: string;
  auto_flag_triggers: string;
}

// Generate URL hash for deduplication
function urlHash(url: string): string {
  return crypto.createHash('sha256').update(url.trim().toLowerCase()).digest('hex').slice(0, 32);
}

// Strip HTML tags
function stripHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000);
}

// Parse RSS feed
async function fetchFeed(feedUrl: string): Promise<{ title: string; link: string; description: string; pubDate?: string }[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'Radar/1.0' },
      next: { revalidate: 0 }
    });
    const text = await res.text();

    // Simple RSS parser
    const items: { title: string; link: string; description: string; pubDate?: string }[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(text)) !== null) {
      const itemXml = match[1];

      const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
      const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
      const dateMatch = itemXml.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i);

      if (titleMatch && linkMatch) {
        items.push({
          title: stripHtml(titleMatch[1]),
          link: linkMatch[1].trim(),
          description: descMatch ? stripHtml(descMatch[1]) : '',
          pubDate: dateMatch ? dateMatch[1].trim() : undefined,
        });
      }
    }

    return items;
  } catch (error) {
    console.error(`Error fetching feed ${feedUrl}:`, error);
    return [];
  }
}

// Parse date string
function parseDate(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // Ignore parse errors
  }
  return new Date().toISOString().split('T')[0];
}

// Score item with AI
async function scoreItem(
  item: FeedItem,
  systemPrompt: string,
  model: string,
  apiKey: string
): Promise<AIScores> {
  const defaultScores: AIScores = {
    theme: item.is_job_board ? 'Job Posting' : 'Thought Leadership',
    threat_level: 1,
    strategic_relevance: 1,
    content_type_weight: 1,
    priority_score: 1.0,
    priority_tier: 'Low',
    route_to: 'Monitor Only',
    key_takeaway: `${item.competitor_name} activity detected. Manual review recommended.`,
    auto_flag_triggers: '',
  };

  if (!apiKey) {
    console.warn('No OpenRouter API key, using default scores');
    return defaultScores;
  }

  try {
    const prompt = systemPrompt
      .replace('{competitor}', item.competitor_name)
      .replace('{title}', item.title)
      .replace('{summary}', item.summary.slice(0, 1500))
      .replace('{date}', item.date)
      .replace('{is_job}', item.is_job_board ? 'Yes' : 'No');

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      console.error('OpenRouter API error:', await res.text());
      return defaultScores;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      console.warn('No JSON in AI response');
      return defaultScores;
    }

    const scores = JSON.parse(jsonMatch[0]);

    // Validate and clamp scores
    const threat = Math.max(1, Math.min(3, parseInt(scores.threat_level) || 1));
    const relevance = Math.max(1, Math.min(3, parseInt(scores.strategic_relevance) || 1));
    const weight = Math.max(1, Math.min(3, parseInt(scores.content_type_weight) || 1));

    // Calculate priority
    const priorityScore = Math.round(((threat + relevance + weight) / 3) * 10) / 10;
    let priorityTier = 'Low';
    if (priorityScore > 2.6) priorityTier = 'Critical';
    else if (priorityScore >= 2.3) priorityTier = 'High';  // >= to make High achievable (2.33 rounds to 2.3)
    else if (priorityScore > 1.6) priorityTier = 'Medium';

    // Check auto-flag triggers override
    const triggers = scores.auto_flag_triggers || '';
    if (triggers.trim()) {
      priorityTier = 'Critical';
    }

    // Validate route_to
    const validRoutes = ['Marketing', 'Product', 'Sales Enablement', 'Leadership', 'Monitor Only'];
    const route = validRoutes.includes(scores.route_to) ? scores.route_to : 'Monitor Only';

    // Validate theme
    const validThemes = [
      'Product/Feature', 'Customer Win', 'Partnership/Integration',
      'Funding/Corporate', 'Competitive Attack', 'Pricing/Packaging',
      'Event/Conference', 'Thought Leadership', 'Job Posting'
    ];
    const theme = validThemes.includes(scores.theme) ? scores.theme : 'Thought Leadership';

    return {
      theme,
      threat_level: threat,
      strategic_relevance: relevance,
      content_type_weight: weight,
      priority_score: priorityScore,
      priority_tier: priorityTier,
      route_to: route,
      key_takeaway: (scores.key_takeaway || '').slice(0, 500),
      auto_flag_triggers: triggers.slice(0, 500),
    };
  } catch (error) {
    console.error('AI scoring error:', error);
    return defaultScores;
  }
}

export async function POST() {
  console.log('Starting ingestion...');

  try {
    // Get config
    const { data: configData } = await supabase
      .from('admin_config')
      .select('key, value');

    const config: Record<string, string> = {};
    for (const row of configData || []) {
      config[row.key] = row.value;
    }

    const model = config.openrouter_model || 'google/gemini-2.0-flash-001';
    const systemPrompt = config.system_prompt || '';
    const apiKey = process.env.OPENROUTER_API_KEY || '';

    if (!systemPrompt) {
      return NextResponse.json({ error: 'No system prompt configured' }, { status: 400 });
    }

    // Get feeds
    const { data: feedsData, error: feedsError } = await supabase
      .from('feeds')
      .select(`
        id,
        url,
        name,
        is_job_board,
        competitor_id,
        competitors (name)
      `);

    if (feedsError) throw feedsError;
    if (!feedsData?.length) {
      return NextResponse.json({ error: 'No feeds configured' }, { status: 400 });
    }

    // Fetch all feeds
    console.log(`Fetching ${feedsData.length} feeds...`);
    const allItems: FeedItem[] = [];

    for (const feed of feedsData) {
      const feedItems = await fetchFeed(feed.url);
      const comp = feed.competitors as { name: string } | { name: string }[] | null;
      const competitorName = Array.isArray(comp) ? comp[0]?.name : comp?.name || 'Unknown';

      for (const item of feedItems) {
        if (!item.link) continue;

        allItems.push({
          title: item.title,
          url: item.link,
          summary: item.description,
          date: parseDate(item.pubDate),
          competitor_id: feed.competitor_id,
          competitor_name: competitorName,
          feed_name: feed.name,
          is_job_board: feed.is_job_board || false,
          url_hash: urlHash(item.link),
        });
      }

      // Update last_fetched_at
      await supabase
        .from('feeds')
        .update({ last_fetched_at: new Date().toISOString() })
        .eq('id', feed.id);
    }

    console.log(`Fetched ${allItems.length} total items`);

    // Check for duplicates - batch hash checks to avoid Supabase .in() limits
    const hashes = allItems.map(i => i.url_hash);
    const BATCH_SIZE = 50;
    const existingHashes = new Set<string>();

    for (let i = 0; i < hashes.length; i += BATCH_SIZE) {
      const batchHashes = hashes.slice(i, i + BATCH_SIZE);
      const { data: existing } = await supabase
        .from('competitor_events')
        .select('url_hash')
        .in('url_hash', batchHashes);

      if (existing) {
        for (const e of existing) {
          existingHashes.add(e.url_hash);
        }
      }
    }

    const newItems = allItems.filter(i => !existingHashes.has(i.url_hash));

    console.log(`${newItems.length} new items (${allItems.length - newItems.length} duplicates)`);

    if (newItems.length === 0) {
      // Update last_ingest time
      await supabase
        .from('admin_config')
        .upsert({ key: 'last_ingest', value: new Date().toISOString() }, { onConflict: 'key' });

      return NextResponse.json({
        success: true,
        total_fetched: allItems.length,
        new_items: 0,
        message: 'No new items to process',
      });
    }

    // Score and insert new items
    let processed = 0;
    const results: { critical: number; high: number; medium: number; low: number } = {
      critical: 0, high: 0, medium: 0, low: 0
    };

    for (const item of newItems) {
      console.log(`Scoring: ${item.title.slice(0, 50)}...`);

      const scores = await scoreItem(item, systemPrompt, model, apiKey);

      // Insert into database
      const { error: insertError } = await supabase
        .from('competitor_events')
        .insert({
          url_hash: item.url_hash,
          title: item.title,
          url: item.url,
          summary: item.summary,
          published_at: item.date,
          competitor_id: item.competitor_id,
          feed_name: item.feed_name,
          is_job_board: item.is_job_board,
          theme: scores.theme,
          threat_level: scores.threat_level,
          strategic_relevance: scores.strategic_relevance,
          content_type_weight: scores.content_type_weight,
          priority_score: scores.priority_score,
          priority_tier: scores.priority_tier,
          route_to: scores.route_to,
          key_takeaway: scores.key_takeaway,
          auto_flag_triggers: scores.auto_flag_triggers,
        });

      if (insertError) {
        console.error('Insert error:', insertError);
      } else {
        processed++;
        const tier = scores.priority_tier.toLowerCase() as keyof typeof results;
        if (tier in results) results[tier]++;
      }

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Update last_ingest time
    await supabase
      .from('admin_config')
      .upsert({ key: 'last_ingest', value: new Date().toISOString() }, { onConflict: 'key' });

    console.log(`Ingestion complete: ${processed} items processed`);

    return NextResponse.json({
      success: true,
      total_fetched: allItems.length,
      new_items: processed,
      results,
    });
  } catch (error) {
    console.error('Ingestion error:', error);
    return NextResponse.json({ error: 'Ingestion failed' }, { status: 500 });
  }
}

// Also support GET for simple health checks
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: '/api/ingest', method: 'POST' });
}
