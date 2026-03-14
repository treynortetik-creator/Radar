import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from './supabase-admin';
import type { DigestConfig, DigestType } from './db';

export type { DigestType };

export const DEFAULT_SLACK_PROMPT = `ABSOLUTE PROHIBITIONS — the output is BROKEN if you include ANY of these:
- # ## ### headings — Slack shows literal "#" characters
- **double asterisks** — Slack uses *single asterisks* for bold
- [text](url) links — Slack uses <url|text> format
- Numbered lists (1. 2. 3.)
- Standard bullet points (- or *)
- "Counter-points", "SafelyYou Counter", "Our response", or any defensive analysis
- "Recommended Action", "Suggested Action", "Next Steps", or ANY recommendations
- "Specifics:" sub-sections or multi-paragraph analysis per item
- Week-over-week tables or comparison data

WHAT TO WRITE:
- One-line bullets only. Each bullet = one fact: who did what + one specific number/claim/detail.
- 2-3 bullets per category. No more.
- Use • (bullet character) for every bullet.
- Keep the TOTAL output under 1500 characters. The example below is the target length.

COPY THIS STRUCTURE EXACTLY (replace bracketed content with real intel):

:rotating_light: Weekly Marketing Intelligence Report - [date]

*:red_circle: IMMEDIATE THREATS:*
• [Competitor] [specific claim or action] — [one key detail]
• [Competitor] [specific claim or action] — [one key detail]

*:large_yellow_circle: COMPETITIVE ESCALATION:*
• [Competitor] [specific move] — [one key detail]
• [Competitor] [specific move] — [one key detail]
• [Competitor] [specific move] — [one key detail]

*:large_green_circle: STRATEGIC OPPORTUNITIES:*
• [Market signal or competitor gap] — [one key detail]
• [Market signal or competitor gap] — [one key detail]

*:newspaper: INDUSTRY MOVES:*
• [Industry development] — [one key detail]
• [Industry development] — [one key detail]

:bar_chart: Full Report: {report_url}
Data Period: [start] to [end] | Events: [count] | Industry: [count]`;

export interface DigestResult {
  content: string;
  summary: string;
  slack_summary: string;
  event_count: number;
  industry_news_count: number;
  competitor_breakdown: Record<string, number>;
  industry_breakdown: Record<string, number>;
  model_used: string;
  tokens_used: number | null;
  digest_type: DigestType;
  period_start: string;
  period_end: string;
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
 * Extract the Slack Executive Summary section from digest content.
 * Falls back to a trimmed version of the full summary if section not found.
 */
export function extractSlackSummary(content: string): string {
  // Try multiple patterns for the Slack section heading
  const patterns = [
    /^##\s+Slack Executive Summary\b/im,
    /^##\s+Slack\s+Summary\b/im,
    /^##\s+Executive Summary\b/im,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match.index !== undefined) {
      const sectionContent = content.slice(match.index + match[0].length).trim();
      return sectionContent.slice(0, 2985);
    }
  }

  // Fallback: strip markdown formatting for Slack compatibility
  const fallback = extractSummary(content)
    .replace(/^#{1,4}\s+.*/gm, '')       // strip all heading levels
    .replace(/\*\*(.+?)\*\*/g, '*$1*')   // convert **bold** to *bold* for Slack
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>') // convert [text](url) to <url|text>
    .replace(/^\s*\|.*\|$/gm, '')        // strip markdown tables
    .replace(/^\s*[-|:]+\s*$/gm, '')     // strip table separators
    .replace(/\n{3,}/g, '\n\n')          // collapse excess newlines
    .trim();
  return fallback.slice(0, 2985);
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
export async function generateDigest(type: DigestType = 'weekly', configOverride?: Partial<DigestConfig>): Promise<DigestResult> {
  // 1. Calculate date range based on digest type
  const daysMap: Record<DigestType, number> = { weekly: 7, monthly: 30, '90day': 90, '180day': 180 };
  const days = daysMap[type];
  const now = new Date();
  const rangeStart = new Date(now);
  rangeStart.setDate(rangeStart.getDate() - days);

  const weekEnd = now.toISOString().split('T')[0];
  const weekStart = rangeStart.toISOString().split('T')[0];

  // 2. Fetch events from past 7 days
  const { data: events, error: eventsError } = await supabaseAdmin
    .from('competitor_events')
    .select(`
      id, title, url, summary, published_at, theme,
      threat_level, priority_score, priority_tier, key_takeaway,
      competitors!competitor_events_competitor_id_fkey (name)
    `)
    .gte('published_at', rangeStart.toISOString())
    .order('priority_score', { ascending: false })
    .limit(40);

  if (eventsError) throw new Error(`Failed to fetch events: ${eventsError.message}`);
  const typedEvents = (events || []) as unknown as EventRow[];

  // 3. Fetch industry items from past N days
  //    Primary source: industry_news table (populated by ingest_industry.py)
  //    Fallback: competitor_events with category='industry_news' (populated by TS ingest)
  const { data: industryData, error: industryError } = await supabaseAdmin
    .from('industry_news')
    .select('id, title, url, summary, published_at, source_name, relevance_tier, relevance_summary')
    .gte('published_at', rangeStart.toISOString())
    .order('published_at', { ascending: false })
    .limit(80);

  if (industryError) throw new Error(`Failed to fetch industry news: ${industryError.message}`);

  let allIndustryItems = (industryData || []) as IndustryRow[];

  // Fallback: if industry_news table is empty, pull from competitor_events
  if (allIndustryItems.length === 0) {
    const { data: fallbackData, error: fallbackError } = await supabaseAdmin
      .from('competitor_events')
      .select('id, title, url, summary, published_at, feed_name, priority_tier, key_takeaway')
      .eq('category', 'industry_news')
      .gte('published_at', rangeStart.toISOString())
      .order('priority_score', { ascending: false })
      .limit(80);

    if (!fallbackError && fallbackData && fallbackData.length > 0) {
      console.log(`[Digest] industry_news table empty, using ${fallbackData.length} items from competitor_events`);
      // Map competitor_events fields to IndustryRow shape
      allIndustryItems = (fallbackData as unknown as {
        id: number; title: string; url: string; summary: string | null;
        published_at: string | null; feed_name: string;
        priority_tier: string | null; key_takeaway: string | null;
      }[]).map((row) => {
        // Map priority_tier → relevance_tier
        let relevance_tier: 'Major' | 'Notable' | 'Background' = 'Background';
        const tier = (row.priority_tier || '').toLowerCase();
        if (tier === 'critical' || tier === 'high') relevance_tier = 'Major';
        else if (tier === 'medium') relevance_tier = 'Notable';

        return {
          id: row.id,
          title: row.title,
          url: row.url,
          summary: row.summary,
          published_at: row.published_at,
          source_name: row.feed_name || 'Industry Feed',
          relevance_tier,
          relevance_summary: row.key_takeaway,
        } as IndustryRow;
      });
    }
  }

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
    .eq('digest_type', type)
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
    .eq('digest_type', type)
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

  const userMessage = `MANDATORY: Your response MUST contain EXACTLY three sections with these EXACT headings (copy-paste these headings verbatim):

## Competitive Intel
## Industry News
## Slack Executive Summary

Do NOT rename, reword, or rearrange these headings. Do NOT use "7-Day Summary", "Key Trends", or any other heading names. The system parses these exact strings to display the report. Wrong headings = broken output.

---

${config.system_prompt || 'Generate an executive weekly intelligence brief.'}
${focusAreasText}

SAFELYOU MASTER CONTEXT:
${masterContext}

SAFELYOU INDUSTRY CONTEXT:
${industryContext}
${previousDigestSummary}

THIS WEEK'S COMPETITOR EVENTS (${weekStart} to ${weekEnd}):
Total events: ${typedEvents.length}

${eventsText || 'No events found in the past 7 days.'}

THIS WEEK'S INDUSTRY NEWS (${weekStart} to ${weekEnd}):
Total industry items (all tiers): ${allIndustryItems.length}
Major/Notable included in digest narrative: ${digestIndustryItems.length}

${industryText || 'No Major/Notable industry items found in the past 7 days.'}

---

OUTPUT RULES (these are non-negotiable):

SECTION 1: ## Competitive Intel
- Use standard markdown (### subheadings, **bold**, tables, bullet points are all fine)
- Detailed, executive-ready analysis specific to SafelyYou
- Include week-over-week comparison if previous digest data is available
- Name specific competitors, products, actions, and numbers

SECTION 2: ## Industry News
- Use standard markdown (### subheadings, **bold**, bullet points are all fine)
- Analyze the ${digestIndustryItems.length} Major/Notable industry items provided above
- Group by theme (regulatory, M&A, technology, workforce, etc.)
- Explain SafelyYou relevance and recommended actions for each

SECTION 3: ## Slack Executive Summary
This section is posted DIRECTLY into Slack. It uses Slack mrkdwn, NOT standard markdown.
The following instructions control the Slack output format and content:

${config.slack_prompt || DEFAULT_SLACK_PROMPT}

Use these variables in your output (they will be replaced automatically):
- {report_url} — link to the full report
- Date range: ${weekStart} to ${weekEnd}
- Events tracked: ${typedEvents.length}
- Industry items: ${allIndustryItems.length}

REMINDER: Start your response with "## Competitive Intel" — not a date, not a title, not a summary.`;

  // 8. Call OpenRouter API
  const apiKey = process.env.OPENROUTER_API_KEY || '';
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

  const model = config.model || 'google/gemini-2.0-flash-001';

  const requestBody: Record<string, unknown> = {
    model,
    messages: [{ role: 'user', content: userMessage }],
    temperature: 0.3,
    max_tokens: 4000,
  };

  // Pass reasoning effort to OpenRouter when enabled
  const effort = config.reasoning_effort;
  if (effort && effort !== 'off') {
    requestBody.reasoning = { effort };
  }

  // 4-minute timeout for frontier thinking models (leaves buffer for DB save + Slack)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 240_000);

  let response: Response;
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const tokensUsed = data.usage?.total_tokens || null;

  if (!content) throw new Error('Empty response from AI model');

  // 9. Extract the Slack summary, then strip that section from stored content
  const slackSummary = extractSlackSummary(content);
  // Strip the Slack section from stored content (try multiple heading patterns)
  const cleanContent = content
    .replace(/\n*##\s+(?:Slack\s+)?Executive Summary[\s\S]*$/i, '')
    .replace(/\n*##\s+Slack\s+Summary[\s\S]*$/i, '')
    .trim();

  // 10. Build result (Slack posting is handled by the route after DB save)
  const competitorBreakdown = buildBreakdown(typedEvents);
  const industryBreakdown = buildIndustryBreakdown(allIndustryItems);

  return {
    content: cleanContent,
    summary: extractSummary(cleanContent),
    slack_summary: slackSummary,
    event_count: typedEvents.length,
    industry_news_count: digestIndustryItems.length,
    competitor_breakdown: competitorBreakdown,
    industry_breakdown: industryBreakdown,
    model_used: model,
    tokens_used: tokensUsed,
    digest_type: type,
    period_start: weekStart,
    period_end: weekEnd,
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
