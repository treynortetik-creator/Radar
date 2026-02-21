import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from './supabase-admin';
import { postDigestToSlack } from './slack';
import type { DigestConfig } from './db';

interface DigestResult {
  content: string;
  summary: string;
  event_count: number;
  industry_news_count: number;
  competitor_breakdown: Record<string, number>;
  industry_breakdown: Record<string, number>;
  model_used: string;
  tokens_used: number | null;
  slack_posted: boolean;
  slack_ts: string | null;
  slack_error: string | null;
}

interface EventRow {
  id: number;
  title: string;
  url: string;
  summary: string | null;
  published_at: string | null;
  theme: string | null;
  threat_level: number | null;
  priority_score: number | null;
  priority_tier: string | null;
  key_takeaway: string | null;
  competitors: { name: string } | { name: string }[] | null;
}

interface IndustryRow {
  id: number;
  title: string;
  url: string;
  summary: string | null;
  published_at: string | null;
  source_name: string;
  relevance_tier: 'Major' | 'Notable' | 'Background' | null;
  relevance_summary: string | null;
}

/**
 * Extract executive summary from digest content.
 * Takes text before the second ## heading.
 */
export function extractSummary(content: string): string {
  const lines = content.split('\n');
  let headingCount = 0;
  const summaryLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      headingCount++;
      if (headingCount >= 2) break;
    }
    summaryLines.push(line);
  }

  return summaryLines.join('\n').trim();
}

/**
 * Build competitor breakdown from events data
 */
function buildBreakdown(events: EventRow[]): Record<string, number> {
  const breakdown: Record<string, number> = {};
  for (const event of events) {
    const comp = event.competitors;
    const name = Array.isArray(comp) ? comp[0]?.name : comp?.name || 'Unknown';
    breakdown[name] = (breakdown[name] || 0) + 1;
  }
  return breakdown;
}

function buildIndustryBreakdown(items: IndustryRow[]): Record<string, number> {
  const breakdown: Record<string, number> = {
    Major: 0,
    Notable: 0,
    Background: 0,
  };

  for (const item of items) {
    const tier = item.relevance_tier || 'Background';
    breakdown[tier] = (breakdown[tier] || 0) + 1;
  }
  return breakdown;
}

/**
 * Format events into structured text for the LLM prompt
 */
function formatEventsForPrompt(events: EventRow[]): string {
  return events
    .map((e, i) => {
      const comp = e.competitors;
      const compName = Array.isArray(comp) ? comp[0]?.name : comp?.name || 'Unknown';
      return `${i + 1}. [${compName}] "${e.title}"
   URL: ${e.url}
   Date: ${e.published_at || 'Unknown'}
   Theme: ${e.theme || 'N/A'} | Tier: ${e.priority_tier || 'N/A'} | Score: ${e.priority_score?.toFixed(1) || 'N/A'}
   Summary: ${e.summary || 'No summary available'}
   Key Takeaway: ${e.key_takeaway || 'N/A'}`;
    })
    .join('\n\n');
}

function formatIndustryForPrompt(items: IndustryRow[]): string {
  return items
    .map((item, i) => {
      return `${i + 1}. [${item.relevance_tier || 'Background'}] "${item.title}"
   Source: ${item.source_name}
   URL: ${item.url}
   Date: ${item.published_at || 'Unknown'}
   Summary: ${item.summary || 'No summary available'}
   Relevance Note: ${item.relevance_summary || 'N/A'}`;
    })
    .join('\n\n');
}

/**
 * Load the SafelyYou Master Context from the repo root
 */
function loadMasterContext(): string {
  try {
    const filePath = path.join(process.cwd(), 'SafelyYou_Master_Context_v2.md');
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.warn('Could not load SafelyYou Master Context:', err);
    return '(Master context file not available)';
  }
}

function loadIndustryContext(): string {
  try {
    const filePath = path.join(process.cwd(), 'SafelyYou_Industry_Context.md');
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.warn('Could not load SafelyYou Industry Context:', err);
    return '(Industry context file not available)';
  }
}

/**
 * Generate a weekly intel digest using AI
 */
export async function generateDigest(configOverride?: Partial<DigestConfig>): Promise<DigestResult> {
  // 1. Calculate date range (past 7 days)
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const weekEnd = now.toISOString().split('T')[0];
  const weekStart = sevenDaysAgo.toISOString().split('T')[0];

  // 2. Fetch events from past 7 days
  const { data: events, error: eventsError } = await supabaseAdmin
    .from('competitor_events')
    .select(`
      id, title, url, summary, published_at, theme,
      threat_level, priority_score, priority_tier, key_takeaway,
      competitors!competitor_events_competitor_id_fkey (name)
    `)
    .gte('published_at', sevenDaysAgo.toISOString())
    .order('priority_score', { ascending: false })
    .limit(40);

  if (eventsError) throw new Error(`Failed to fetch events: ${eventsError.message}`);
  const typedEvents = (events || []) as unknown as EventRow[];

  // 3. Fetch industry items from past 7 days
  const { data: industryData, error: industryError } = await supabaseAdmin
    .from('industry_news')
    .select('id, title, url, summary, published_at, source_name, relevance_tier, relevance_summary')
    .gte('published_at', sevenDaysAgo.toISOString())
    .order('published_at', { ascending: false })
    .limit(80);

  if (industryError) throw new Error(`Failed to fetch industry news: ${industryError.message}`);

  const allIndustryItems = (industryData || []) as IndustryRow[];
  const digestIndustryItems = allIndustryItems.filter(
    (item) => item.relevance_tier === 'Major' || item.relevance_tier === 'Notable',
  );

  // 4. Load contexts
  const masterContext = loadMasterContext();
  const industryContext = loadIndustryContext();

  // 5. Load digest config
  const { data: configData, error: configError } = await supabaseAdmin
    .from('digest_config')
    .select('*')
    .eq('is_active', true)
    .order('id', { ascending: false })
    .limit(1)
    .single();

  if (configError) throw new Error(`Failed to load digest config: ${configError.message}`);

  const config = { ...configData, ...configOverride } as DigestConfig;

  // 6. Load previous week's digest for week-over-week comparison
  let previousDigestSummary = '';
  const { data: prevDigest } = await supabaseAdmin
    .from('weekly_digests')
    .select('summary, content, week_start, week_end')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (prevDigest) {
    previousDigestSummary = `\n\n## PREVIOUS WEEK'S REPORT (${prevDigest.week_start} to ${prevDigest.week_end}):\n${prevDigest.summary || prevDigest.content?.slice(0, 1000) || 'No previous summary available'}`;
  }

  // 7. Build the prompt
  const eventsText = formatEventsForPrompt(typedEvents);
  const industryText = formatIndustryForPrompt(digestIndustryItems);
  const focusAreasText = config.focus_areas?.length
    ? `\n\nCurrent Focus Areas: ${config.focus_areas.join(', ')}`
    : '';

  const userMessage = `${config.system_prompt || 'Generate an executive weekly intelligence brief.'}
${focusAreasText}

## SAFELYOU MASTER CONTEXT:
${masterContext}

## SAFELYOU INDUSTRY CONTEXT:
${industryContext}
${previousDigestSummary}

## THIS WEEK'S COMPETITOR EVENTS (${weekStart} to ${weekEnd}):
Total events: ${typedEvents.length}

${eventsText || 'No events found in the past 7 days.'}

## THIS WEEK'S INDUSTRY NEWS (${weekStart} to ${weekEnd}):
Total industry items (all tiers): ${allIndustryItems.length}
Major/Notable included in digest narrative: ${digestIndustryItems.length}

${industryText || 'No Major/Notable industry items found in the past 7 days.'}

## REQUIRED OUTPUT FORMAT
Provide exactly two top-level markdown sections in this order:
1) ## Competitive Intel
2) ## Industry News

Each section must be concise, executive-ready, and specific to SafelyYou actions/opportunities.`;

  // 8. Call OpenRouter API
  const apiKey = process.env.OPENROUTER_API_KEY || '';
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

  const model = config.model || 'google/gemini-2.0-flash-001';

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: userMessage }],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const tokensUsed = data.usage?.total_tokens || null;

  if (!content) throw new Error('Empty response from AI model');

  // 9. Attempt Slack post (never throw)
  const competitorBreakdown = buildBreakdown(typedEvents);
  const industryBreakdown = buildIndustryBreakdown(allIndustryItems);

  const slackResult = await postDigestToSlack({
    weekLabel: weekEnd,
    digestContent: content,
    eventCount: typedEvents.length,
    industryNewsCount: digestIndustryItems.length,
    competitorBreakdown,
    industryBreakdown,
  });

  // 10. Build result
  return {
    content,
    summary: extractSummary(content),
    event_count: typedEvents.length,
    industry_news_count: digestIndustryItems.length,
    competitor_breakdown: competitorBreakdown,
    industry_breakdown: industryBreakdown,
    model_used: model,
    tokens_used: tokensUsed,
    slack_posted: slackResult.ok,
    slack_ts: slackResult.ts || null,
    slack_error: slackResult.ok ? null : (slackResult.error || null),
  };
}

// ============================================================
// Weekly Digest Aggregation (structured data for /api/digest/run)
// ============================================================

export interface WeeklyAggregateResult {
  weekStart: string;
  weekEnd: string;
  totalEvents: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  topMovers: { name: string; count: number; highCount: number }[];
  competitorBreakdown: Record<string, { total: number; high: number; medium: number; low: number }>;
}

/**
 * Aggregate competitor events for the past 7 days.
 * Groups by competitor and threat_level, counts HIGH/MEDIUM/LOW per competitor.
 * Identifies top movers (most events this week).
 * Returns a structured digest object — no AI, pure data.
 */
export async function aggregateWeeklyDigest(): Promise<WeeklyAggregateResult> {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const weekEnd = now.toISOString().split('T')[0];
  const weekStart = sevenDaysAgo.toISOString().split('T')[0];

  // Query events from the past 7 days, joined with competitor names
  // Exclude industry_news category from competitor stats
  const { data: events, error } = await supabaseAdmin
    .from('competitor_events')
    .select(`
      id,
      threat_level,
      priority_tier,
      category,
      competitors!competitor_events_competitor_id_fkey (name)
    `)
    .gte('published_at', sevenDaysAgo.toISOString())
    .not('competitor_id', 'is', null)
    .neq('category', 'industry_news');

  if (error) {
    throw new Error(`Failed to aggregate events: ${error.message}`);
  }

  const typedEvents = (events || []) as unknown as {
    id: number;
    threat_level: number | null;
    priority_tier: string | null;
    category: string | null;
    competitors: { name: string } | { name: string }[] | null;
  }[];

  // Group by competitor
  const breakdown: Record<string, { total: number; high: number; medium: number; low: number }> = {};

  for (const event of typedEvents) {
    const comp = event.competitors;
    const name = Array.isArray(comp) ? comp[0]?.name : comp?.name || 'Unknown';
    if (!breakdown[name]) {
      breakdown[name] = { total: 0, high: 0, medium: 0, low: 0 };
    }
    breakdown[name].total++;

    const tier = (event.priority_tier || '').toLowerCase();
    const level = event.threat_level || 1;

    if (tier === 'critical' || tier === 'high' || level === 3) {
      breakdown[name].high++;
    } else if (tier === 'medium' || level === 2) {
      breakdown[name].medium++;
    } else {
      breakdown[name].low++;
    }
  }

  // Top movers: sorted by total events descending
  const topMovers = Object.entries(breakdown)
    .map(([name, stats]) => ({ name, count: stats.total, highCount: stats.high }))
    .sort((a, b) => b.count - a.count);

  const totalEvents = typedEvents.length;
  const highCount = Object.values(breakdown).reduce((sum, s) => sum + s.high, 0);
  const mediumCount = Object.values(breakdown).reduce((sum, s) => sum + s.medium, 0);
  const lowCount = Object.values(breakdown).reduce((sum, s) => sum + s.low, 0);

  return {
    weekStart,
    weekEnd,
    totalEvents,
    highCount,
    mediumCount,
    lowCount,
    topMovers,
    competitorBreakdown: breakdown,
  };
}
