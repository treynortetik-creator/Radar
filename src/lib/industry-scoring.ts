import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IndustryScores {
  relevance_tier: 'Major' | 'Notable' | 'Background';
  relevance_summary: string;
  topics: string[];
  mentioned_accounts: string[];
}

export interface IndustryItem {
  title: string;
  url: string;
  summary: string;
  published_at: string;
  source_name: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const VALID_TIERS: ReadonlySet<string> = new Set(['Major', 'Notable', 'Background']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultScore(item: IndustryItem): IndustryScores {
  return {
    relevance_tier: 'Background',
    relevance_summary: `General industry context from ${item.source_name || 'source'}. No immediate SafelyYou action identified.`,
    topics: [],
    mentioned_accounts: [],
  };
}

/**
 * Load the SafelyYou industry context markdown from the repo root.
 * Returns an empty string if the file is missing (non-fatal).
 */
export function loadIndustryContext(): string {
  const filePath = path.join(process.cwd(), 'SafelyYou_Industry_Context.md');
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    console.warn('[industry-scoring] SafelyYou_Industry_Context.md not found at', filePath);
    return 'SafelyYou is an AI fall detection company focused on memory care and assisted living. Prioritize regulatory changes, REIT/operator moves, and customer-impacting developments.';
  }
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Call OpenRouter to score a single industry news item for SafelyYou relevance.
 *
 * Rate limiting is the caller's responsibility — this function fires one
 * request and returns.
 */
export async function scoreIndustryItem(
  item: IndustryItem,
  industryContext: string,
  model: string,
  apiKey: string,
): Promise<IndustryScores> {
  const fallback = defaultScore(item);

  if (!apiKey) {
    console.warn('[industry-scoring] No API key provided; returning fallback score');
    return fallback;
  }

  const prompt = `You are scoring senior living industry news for SafelyYou relevance.
Use the context to classify each article into exactly one tier: Major, Notable, or Background.

Return STRICT JSON with keys:
{
  "relevance_tier": "Major|Notable|Background",
  "relevance_summary": "1-2 sentences, specific to SafelyYou",
  "topics": ["lowercase-topic-tags"],
  "mentioned_accounts": ["account names mentioned in article"]
}

SafelyYou Industry Context:
${industryContext.slice(0, 30000)}

Article:
Title: ${item.title}
Source: ${item.source_name}
URL: ${item.url}
Published: ${item.published_at}
Summary: ${(item.summary || '').slice(0, 2000)}`;

  try {
    const resp = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 600,
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error(`[industry-scoring] OpenRouter error: ${resp.status} ${text.slice(0, 180)}`);
      return fallback;
    }

    const data = await resp.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[industry-scoring] No JSON found in model response; using fallback');
      return fallback;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // --- Validate tier ---
    let tier = String(parsed.relevance_tier ?? 'Background').trim();
    // Normalize casing: "major" -> "Major", "NOTABLE" -> "Notable", etc.
    tier = tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
    if (!VALID_TIERS.has(tier)) {
      tier = 'Background';
    }

    // --- Validate summary ---
    let summary = String(parsed.relevance_summary ?? '').trim();
    if (!summary) {
      summary = fallback.relevance_summary;
    }
    summary = summary.slice(0, 500);

    // --- Validate topics ---
    const rawTopics = parsed.topics;
    let topics: string[] = [];
    if (Array.isArray(rawTopics)) {
      topics = rawTopics
        .map((t: unknown) => String(t).trim().slice(0, 60))
        .filter((t: string) => t.length > 0)
        .slice(0, 20);
    }

    // --- Validate mentioned_accounts ---
    const rawAccounts = parsed.mentioned_accounts;
    let accounts: string[] = [];
    if (Array.isArray(rawAccounts)) {
      accounts = rawAccounts
        .map((a: unknown) => String(a).trim().slice(0, 120))
        .filter((a: string) => a.length > 0)
        .slice(0, 20);
    }

    return {
      relevance_tier: tier as IndustryScores['relevance_tier'],
      relevance_summary: summary,
      topics,
      mentioned_accounts: accounts,
    };
  } catch (err) {
    console.error('[industry-scoring] Scoring exception:', err);
    return fallback;
  }
}
