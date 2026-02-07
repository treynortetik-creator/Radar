import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from './supabase-admin';
import type { DigestConfig } from './db';

interface DigestResult {
  content: string;
  summary: string;
  event_count: number;
  competitor_breakdown: Record<string, number>;
  model_used: string;
  tokens_used: number | null;
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

/**
 * Format events into structured text for the LLM prompt
 */
function formatEventsForPrompt(events: EventRow[]): string {
  return events.map((e, i) => {
    const comp = e.competitors;
    const compName = Array.isArray(comp) ? comp[0]?.name : comp?.name || 'Unknown';
    return `${i + 1}. [${compName}] "${e.title}"
   URL: ${e.url}
   Date: ${e.published_at || 'Unknown'}
   Theme: ${e.theme || 'N/A'} | Tier: ${e.priority_tier || 'N/A'} | Score: ${e.priority_score?.toFixed(1) || 'N/A'}
   Summary: ${e.summary || 'No summary available'}
   Key Takeaway: ${e.key_takeaway || 'N/A'}`;
  }).join('\n\n');
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

  // 3. Load master context
  const masterContext = loadMasterContext();

  // 4. Load digest config
  const { data: configData, error: configError } = await supabaseAdmin
    .from('digest_config')
    .select('*')
    .eq('is_active', true)
    .order('id', { ascending: false })
    .limit(1)
    .single();

  if (configError) throw new Error(`Failed to load digest config: ${configError.message}`);

  const config = { ...configData, ...configOverride } as DigestConfig;

  // 5. Load previous week's digest for week-over-week comparison
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

  // 6. Build the prompt
  const eventsText = formatEventsForPrompt(typedEvents);
  const focusAreasText = config.focus_areas?.length
    ? `\n\nCurrent Focus Areas: ${config.focus_areas.join(', ')}`
    : '';

  const userMessage = `${config.system_prompt}
${focusAreasText}

## SAFELYOU MASTER CONTEXT:
${masterContext}
${previousDigestSummary}

## THIS WEEK'S COMPETITOR EVENTS (${weekStart} to ${weekEnd}):
Total events: ${typedEvents.length}

${eventsText || 'No events found in the past 7 days.'}`;

  // 7. Call OpenRouter API
  const apiKey = process.env.OPENROUTER_API_KEY || '';
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

  const model = config.model || 'google/gemini-2.0-flash-001';

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
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

  // 8. Build result
  return {
    content,
    summary: extractSummary(content),
    event_count: typedEvents.length,
    competitor_breakdown: buildBreakdown(typedEvents),
    model_used: model,
    tokens_used: tokensUsed,
  };
}
