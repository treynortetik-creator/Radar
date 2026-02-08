import { supabaseAdmin } from './supabase-admin';
import type { DigestConfig } from './db';

export type DigestType = 'weekly' | 'monthly';

interface DigestResult {
  content: string;
  summary: string;
  event_count: number;
  competitor_breakdown: Record<string, number>;
  model_used: string;
  tokens_used: number | null;
  digest_type: DigestType;
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
 * Load the SafelyYou Master Context from Supabase admin_config
 */
async function loadMasterContext(): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin
      .from('admin_config')
      .select('value')
      .eq('key', 'master_context')
      .single();

    if (error || !data?.value) {
      console.warn('Could not load master context from database:', error?.message);
      return '';
    }
    return data.value;
  } catch (err) {
    console.warn('Could not load SafelyYou Master Context:', err);
    return '';
  }
}

const PERIOD_CONFIG = {
  weekly: { days: 7, label: 'WEEK', maxTokens: 4000 },
  monthly: { days: 30, label: 'MONTH', maxTokens: 6000 },
} as const;

/**
 * Generate an intel digest using AI
 */
export async function generateDigest(
  digestType: DigestType = 'weekly',
  configOverride?: Partial<DigestConfig>
): Promise<DigestResult> {
  const period = PERIOD_CONFIG[digestType];

  // 1. Calculate date range
  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - period.days);

  const endDate = now.toISOString().split('T')[0];
  const startDate = periodStart.toISOString().split('T')[0];

  // 2. Fetch events from the period
  const { data: events, error: eventsError } = await supabaseAdmin
    .from('competitor_events')
    .select(`
      id, title, url, summary, published_at, theme,
      threat_level, priority_score, priority_tier, key_takeaway,
      competitors!competitor_events_competitor_id_fkey (name)
    `)
    .gte('published_at', periodStart.toISOString())
    .order('priority_score', { ascending: false });

  if (eventsError) throw new Error(`Failed to fetch events: ${eventsError.message}`);

  const typedEvents = (events || []) as unknown as EventRow[];

  // 3. Load master context
  const masterContext = await loadMasterContext();

  // 4. Load digest config for this type
  const { data: configData, error: configError } = await supabaseAdmin
    .from('digest_config')
    .select('*')
    .eq('is_active', true)
    .eq('digest_type', digestType)
    .order('id', { ascending: false })
    .limit(1)
    .single();

  if (configError) throw new Error(`Failed to load ${digestType} digest config: ${configError.message}`);

  const config = { ...configData, ...configOverride } as DigestConfig;

  // 5. Load previous digest of the same type for comparison
  let previousDigestSummary = '';
  const { data: prevDigest } = await supabaseAdmin
    .from('weekly_digests')
    .select('summary, content, week_start, week_end')
    .eq('digest_type', digestType)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (prevDigest) {
    const compLabel = digestType === 'monthly' ? "PREVIOUS MONTH'S REPORT" : "PREVIOUS WEEK'S REPORT";
    previousDigestSummary = `\n\n## ${compLabel} (${prevDigest.week_start} to ${prevDigest.week_end}):\n${prevDigest.summary || prevDigest.content?.slice(0, 1000) || 'No previous summary available'}`;
  }

  // 6. Build the prompt
  const eventsText = formatEventsForPrompt(typedEvents);
  const focusAreasText = config.focus_areas?.length
    ? `\n\nCurrent Focus Areas: ${config.focus_areas.join(', ')}`
    : '';

  const periodLabel = digestType === 'monthly' ? "THIS MONTH'S" : "THIS WEEK'S";
  const noEventsMsg = digestType === 'monthly'
    ? 'No events found in the past 30 days.'
    : 'No events found in the past 7 days.';

  const userMessage = `${config.system_prompt}
${focusAreasText}

## SAFELYOU MASTER CONTEXT:
${masterContext}
${previousDigestSummary}

## ${periodLabel} COMPETITOR EVENTS (${startDate} to ${endDate}):
Total events: ${typedEvents.length}

${eventsText || noEventsMsg}`;

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
      max_tokens: period.maxTokens,
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
    digest_type: digestType,
  };
}
