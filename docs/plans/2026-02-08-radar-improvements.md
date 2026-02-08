# Radar Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix master context injection (both digest and ingest), add context status UI, dynamic OpenRouter model selection, job board full-content fetching, relabel event cards, clean up dead dependencies, and review the system prompt.

**Architecture:** Master context moves from filesystem to Supabase `admin_config` table (key: `master_context`). Both digest and ingest load it from DB. A new `/api/openrouter/models` route proxies and caches the OpenRouter models list. Job board content fetching uses `cheerio` for lightweight HTML parsing during ingest.

**Tech Stack:** Next.js 16, React 19, Supabase, OpenRouter API, Tailwind CSS, cheerio (new dependency)

---

## Task 1: Remove better-sqlite3 dependency

Unused since the Supabase migration. Adds native binary compilation overhead on Railway.

**Files:**
- Modify: `package.json`

**Step 1: Remove the dependency**

```bash
cd /Users/treynor/Radar/Radar && npm uninstall better-sqlite3 && npm uninstall -D @types/better-sqlite3
```

**Step 2: Verify no code references remain**

```bash
grep -r "better-sqlite3" src/ --include="*.ts" --include="*.tsx"
```

Expected: No results.

**Step 3: Verify build still works**

```bash
npm run build
```

Expected: Build succeeds.

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove unused better-sqlite3 dependency"
```

---

## Task 2: Store master context in Supabase

Move `SafelyYou_Master_Context_v2.md` content into `admin_config` table as key `master_context`. No new migration needed — `admin_config` already supports arbitrary key-value pairs. This is a shared database with FlightLog, so we avoid schema changes.

**Files:**
- Modify: `src/app/api/admin/config/route.ts` — add master_context to GET/POST
- Modify: `src/lib/digest.ts` — load from Supabase instead of filesystem
- Modify: `src/app/api/ingest/route.ts` — load and inject master context
- Modify: `src/app/admin/page.tsx` — add master context editor + status indicator

### Step 1: Update admin config API to handle master_context

**File:** `src/app/api/admin/config/route.ts`

In the `GET` handler, add `master_context` to the response:

```typescript
return NextResponse.json({
  model: config.openrouter_model || 'google/gemini-2.0-flash-001',
  system_prompt: config.system_prompt || '',
  master_context: config.master_context || '',
  last_ingest: config.last_ingest || null,
});
```

In the `POST` handler, add master_context upsert after the system_prompt block:

```typescript
// Update master context
if (body.master_context !== undefined) {
  const { error: contextError } = await supabase
    .from('admin_config')
    .upsert({ key: 'master_context', value: body.master_context, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (contextError) throw contextError;
}
```

### Step 2: Seed the master context into Supabase

Read the current `SafelyYou_Master_Context_v2.md` file content and POST it to the admin config API, or insert directly via Supabase dashboard/CLI. This is a one-time operation.

We can create a small script at `scripts/seed-master-context.ts` or do it via curl after the API is updated.

### Step 3: Update digest.ts to load from Supabase

**File:** `src/lib/digest.ts`

Replace the `loadMasterContext()` function (lines 81-89) with:

```typescript
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
```

Update `generateDigest()` — the call to `loadMasterContext()` on line 120 now needs `await`:

```typescript
const masterContext = await loadMasterContext();
```

Remove the `fs` and `path` imports from the top of the file (lines 1-2) since they're no longer needed.

### Step 4: Update ingest route to inject master context

**File:** `src/app/api/ingest/route.ts`

In the `POST` handler, after loading config (around line 228), also grab master_context:

```typescript
const masterContext = config.master_context || '';
```

Pass it to `scoreItem()` — update the function signature:

```typescript
async function scoreItem(
  item: FeedItem,
  systemPrompt: string,
  masterContext: string,
  model: string,
  apiKey: string
): Promise<AIScores> {
```

In the prompt construction (line 128), inject master context:

```typescript
const prompt = `${systemPrompt}

## SAFELYOU COMPANY CONTEXT:
${masterContext}

## ITEM TO SCORE:
Competitor: ${item.competitor_name}
Title: ${item.title}
Summary: ${item.summary.slice(0, 1500)}
Date: ${item.date}
Is Job Board: ${item.is_job_board ? 'Yes' : 'No'}`;
```

Note: This replaces the old placeholder substitution approach. The system prompt should no longer need `{competitor}`, `{title}`, etc. placeholders — they're now in the structured "ITEM TO SCORE" section. The system prompt becomes pure instructions. This is cleaner and avoids the fragile string replacement.

### Step 5: Add master context editor + status indicator to admin UI

**File:** `src/app/admin/page.tsx`

Add state for master context:

```typescript
const [masterContext, setMasterContext] = useState('');
```

Load it in `loadConfig()`:

```typescript
if (data.master_context) setMasterContext(data.master_context);
```

Save it in `saveConfig()`:

```typescript
body: JSON.stringify({ model, system_prompt: systemPrompt, master_context: masterContext }),
```

Add a new section in the Settings tab (after the System Prompt section, before RSS Feeds):

```tsx
{/* Master Context Status & Editor */}
<section className="card-base p-6">
  <div className="flex items-center justify-between mb-4">
    <div>
      <h2 className="text-lg font-semibold text-slate-100">Master Context</h2>
      <p className="text-xs text-slate-500 mt-1">
        SafelyYou company context injected into all AI prompts (ingest + digest)
      </p>
    </div>
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 font-mono">{masterContext.length.toLocaleString()} chars</span>
      {masterContext.length > 0 ? (
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Loaded
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-1 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          Not Loaded
        </span>
      )}
    </div>
  </div>
  <textarea
    value={masterContext}
    onChange={(e) => setMasterContext(e.target.value)}
    rows={10}
    className="input-base font-mono text-sm resize-y min-h-[150px]"
    placeholder="Paste SafelyYou Master Context here..."
  />
</section>
```

Also add a similar status badge to the Digest tab, near the digest system prompt section. A small read-only indicator showing "Master Context: Loaded (X chars)" or "Master Context: Missing".

### Step 6: Verify and commit

```bash
npm run build
git add -A
git commit -m "feat: store master context in Supabase, inject into both ingest and digest"
```

---

## Task 3: Relabel "Intel Summary" to "Source Content"

The expanded card section labeled "Intel Summary" actually shows the raw post text from the RSS feed, not an AI summary. Relabel it.

**Files:**
- Modify: `src/components/EventCard.tsx:173`

**Step 1: Change the label**

Change line 173 from:
```tsx
<span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Intel Summary</span>
```
to:
```tsx
<span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Source Content</span>
```

**Step 2: Commit**

```bash
git add src/components/EventCard.tsx
git commit -m "fix: relabel 'Intel Summary' to 'Source Content' on event cards"
```

---

## Task 4: Dynamic OpenRouter model selection

Replace the hardcoded 7-model radio list with a searchable dropdown that fetches all models from OpenRouter's `/api/v1/models` endpoint. Used in both Settings tab (ingest model) and Digest tab (digest model).

**Files:**
- Create: `src/app/api/openrouter/models/route.ts` — server-side proxy with caching
- Modify: `src/app/admin/page.tsx` — replace radio buttons with searchable dropdown

### Step 1: Create the OpenRouter models API route

**File:** `src/app/api/openrouter/models/route.ts`

```typescript
import { NextResponse } from 'next/server';

interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  architecture?: {
    modality?: string;
  };
}

let cachedModels: OpenRouterModel[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function GET() {
  try {
    const now = Date.now();
    if (cachedModels && now - cacheTimestamp < CACHE_TTL) {
      return NextResponse.json({ models: cachedModels });
    }

    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || ''}`,
      },
    });

    if (!res.ok) throw new Error(`OpenRouter API error: ${res.status}`);

    const data = await res.json();

    // Filter to text models, sort by name
    const models = (data.data || [])
      .filter((m: OpenRouterModel) => m.id && m.name)
      .map((m: OpenRouterModel) => ({
        id: m.id,
        name: m.name,
        pricing: m.pricing,
        context_length: m.context_length,
      }))
      .sort((a: OpenRouterModel, b: OpenRouterModel) => a.name.localeCompare(b.name));

    cachedModels = models;
    cacheTimestamp = now;

    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    // Return hardcoded fallback if API fails
    return NextResponse.json({
      models: [
        { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', pricing: { prompt: '0.0000001', completion: '0.0000003' }, context_length: 1048576 },
        { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', pricing: { prompt: '0.000003', completion: '0.000015' }, context_length: 200000 },
        { id: 'openai/gpt-4o', name: 'GPT-4o', pricing: { prompt: '0.0000025', completion: '0.00001' }, context_length: 128000 },
      ],
      cached: false,
      fallback: true
    });
  }
}
```

### Step 2: Replace model selection UI in admin page

**File:** `src/app/admin/page.tsx`

Remove the hardcoded `OPENROUTER_MODELS` array and `tierColors` constant (lines 34-49).

Add new state and fetch logic:

```typescript
interface OpenRouterModel {
  id: string;
  name: string;
  pricing: { prompt: string; completion: string };
  context_length: number;
}

// In the component:
const [availableModels, setAvailableModels] = useState<OpenRouterModel[]>([]);
const [modelSearch, setModelSearch] = useState('');
const [digestModelSearch, setDigestModelSearch] = useState('');

// Add to useEffect:
const loadModels = async () => {
  try {
    const res = await fetch('/api/openrouter/models');
    const data = await res.json();
    setAvailableModels(data.models || []);
  } catch (err) {
    console.error('Failed to load models:', err);
  }
};

// Call in useEffect alongside other loads
```

Replace the Settings tab model selection section (lines 434-473) with a searchable dropdown:

```tsx
<section className="card-base p-6">
  <h2 className="text-lg font-semibold text-slate-100 mb-4">AI Model Selection</h2>
  <div className="relative">
    <input
      type="text"
      value={modelSearch}
      onChange={(e) => setModelSearch(e.target.value)}
      placeholder="Search models..."
      className="input-base mb-2"
    />
    <select
      value={model}
      onChange={(e) => setModel(e.target.value)}
      className="input-base"
      size={8}
    >
      {availableModels
        .filter(m =>
          m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
          m.id.toLowerCase().includes(modelSearch.toLowerCase())
        )
        .map(m => {
          const promptCost = parseFloat(m.pricing?.prompt || '0') * 1_000_000;
          const completionCost = parseFloat(m.pricing?.completion || '0') * 1_000_000;
          const costStr = promptCost === 0 && completionCost === 0
            ? 'Free'
            : `$${promptCost.toFixed(2)}/$${completionCost.toFixed(2)} per M tokens`;
          return (
            <option key={m.id} value={m.id}>
              {m.name} — {costStr} — {(m.context_length / 1000).toFixed(0)}k ctx
            </option>
          );
        })}
    </select>
    {model && (
      <div className="mt-2 text-xs text-slate-400">
        Selected: <code className="bg-slate-900/60 px-1.5 py-0.5 rounded text-amber-400">{model}</code>
      </div>
    )}
  </div>
</section>
```

Apply the same pattern to the Digest tab model selector (line 794-805), replacing the hardcoded dropdown with one that uses `availableModels` and `digestModelSearch`.

### Step 3: Verify and commit

```bash
npm run build
git add -A
git commit -m "feat: dynamic OpenRouter model selection from API"
```

---

## Task 5: Job board full-content fetching

For feeds flagged as `is_job_board`, fetch the actual job posting page and extract full text content instead of relying on the truncated RSS description.

**Files:**
- Modify: `package.json` — add cheerio
- Modify: `src/app/api/ingest/route.ts` — add content fetching for job board items

### Step 1: Install cheerio

```bash
cd /Users/treynor/Radar/Radar && npm install cheerio
```

### Step 2: Add content fetching function to ingest route

**File:** `src/app/api/ingest/route.ts`

Add import at top:

```typescript
import * as cheerio from 'cheerio';
```

Add function after `stripHtml()`:

```typescript
// Fetch full content from a URL (for job board postings)
async function fetchFullContent(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Radar/1.0 (competitive intelligence)' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove noise
    $('script, style, nav, header, footer, .sidebar, .ads, .cookie-banner').remove();

    // Try to find job content in common structures
    const content =
      $('article').text() ||
      $('[class*="job-description"]').text() ||
      $('[class*="job-detail"]').text() ||
      $('[class*="posting"]').text() ||
      $('main').text() ||
      $('body').text();

    const cleaned = content
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000);

    return cleaned.length > 100 ? cleaned : null;
  } catch (err) {
    console.warn(`Failed to fetch content from ${url}:`, err);
    return null;
  }
}
```

### Step 3: Integrate into the ingest loop

In the `POST` handler, after building `allItems` and before dedup (around line 283), add content fetching for job board items:

```typescript
// Fetch full content for job board postings
for (const item of allItems) {
  if (item.is_job_board && item.url) {
    const fullContent = await fetchFullContent(item.url);
    if (fullContent) {
      item.summary = fullContent;
    }
    // Rate limit page fetches
    await new Promise(r => setTimeout(r, 500));
  }
}
```

### Step 4: Verify and commit

```bash
npm run build
git add -A
git commit -m "feat: fetch full job posting content for job board feeds"
```

---

## Task 6: Review and update the system prompt

The system prompt needs to work cleanly with the new master context injection. It should NOT duplicate company info that's now in the master context. It should focus on instructions for how to score items.

**What to check:**
1. Read the current system prompt from Supabase (via admin UI or API)
2. Ensure it references the master context section ("Use the SafelyYou company context below to inform your scoring")
3. Remove any SafelyYou-specific company info that's duplicated from the master context
4. Update placeholder references — the old `{competitor}`, `{title}`, `{summary}`, `{date}`, `{is_job}` placeholders are replaced by the structured "ITEM TO SCORE" section injected by the code
5. Ensure the prompt clearly instructs the AI to return the expected JSON format

**Recommended system prompt structure:**

```
You are a competitive intelligence analyst for SafelyYou, an AI-powered fall detection company serving senior living facilities.

Use the SafelyYou company context provided below to understand our company's position, products, competitors, and strategic priorities.

Analyze the following competitor activity item and return a JSON assessment.

Score each item considering:
- How directly this threatens SafelyYou's market position
- Strategic relevance to our product roadmap and sales motion
- Content significance (product launch > thought leadership > job posting)

For job board postings: analyze what the role reveals about the competitor's strategic direction, technology investments, and growth areas.

Return ONLY valid JSON with these fields:
{
  "theme": "Product/Feature|Customer Win|Partnership/Integration|Funding/Corporate|Competitive Attack|Pricing/Packaging|Event/Conference|Thought Leadership|Job Posting",
  "threat_level": 1-3 (1=low, 2=moderate, 3=high),
  "strategic_relevance": 1-3 (1=tangential, 2=adjacent, 3=direct competitor move),
  "content_type_weight": 1-3 (1=routine, 2=notable, 3=significant),
  "priority_score": 1.0-3.0 (calculated average),
  "priority_tier": "Low|Medium|High|Critical",
  "route_to": "Marketing|Product|Sales Enablement|Leadership|Monitor Only",
  "key_takeaway": "1-2 sentence insight from SafelyYou's perspective",
  "auto_flag_triggers": "comma-separated triggers if any, or empty string"
}
```

**This is manual/review work** — verify the current prompt in the admin UI, update if needed, and save. No code changes in this task.

### Step 1: Check current prompt via API

```bash
curl -s http://localhost:3000/api/admin/config | jq .system_prompt
```

### Step 2: Update via admin UI if needed

Navigate to admin page, Settings tab, update the System Prompt textarea with the revised prompt above (or a version that fits your needs), and click Save Configuration.

---

## Task 7: Add master context status indicator to digest tab

Small UI addition to the digest tab showing whether the master context is available and will be injected.

**Files:**
- Modify: `src/app/admin/page.tsx` — add status pill near digest system prompt section

### Step 1: Add status indicator

In the Digest tab, before the "Digest System Prompt" section (around line 700), add:

```tsx
{/* Context Status */}
<div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-700/30">
  <span className="text-xs text-slate-400">Master Context:</span>
  {masterContext.length > 0 ? (
    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      Loaded ({(masterContext.length / 1000).toFixed(1)}k chars) — will be injected into digest prompt
    </span>
  ) : (
    <span className="flex items-center gap-1.5 text-xs font-medium text-red-400">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
      Not loaded — configure in Settings tab
    </span>
  )}
</div>
```

### Step 2: Commit

```bash
git add src/app/admin/page.tsx
git commit -m "feat: add master context status indicators to admin UI"
```

---

## Task 8: Seed master context and verify end-to-end

One-time data migration: load the existing `SafelyYou_Master_Context_v2.md` into Supabase.

**Files:**
- Reference: `SafelyYou_Master_Context_v2.md` (root of project)

### Step 1: Create a seed script

**File:** `scripts/seed-master-context.js`

```javascript
const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(
  path.join(__dirname, '..', 'SafelyYou_Master_Context_v2.md'),
  'utf-8'
);

console.log(`Master context loaded: ${content.length} characters`);
console.log('POST this to your running app:');
console.log(`curl -X POST http://localhost:3000/api/admin/config \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -d '{"master_context": "<content>"}'`);
console.log('\nOr paste into the admin UI Master Context editor.');
```

Alternatively, just copy-paste the file content into the admin UI Master Context textarea and save. This is the simplest approach.

### Step 2: Deploy to Railway and verify

After deploying:
1. Open admin page → Settings tab → verify "Master Context: Loaded" badge appears with correct char count
2. Open admin page → Digest tab → verify context status shows "Loaded"
3. Run an ingestion → check Railway logs for master context being included in prompts
4. Generate a digest preview → verify the output references SafelyYou context appropriately

### Step 3: Final commit

```bash
git add -A
git commit -m "chore: add seed script for master context migration"
```

---

## Execution Order

1. **Task 1** — Remove better-sqlite3 (independent, quick win)
2. **Task 3** — Relabel Intel Summary (independent, quick win)
3. **Task 2** — Master context in Supabase (core infrastructure change)
4. **Task 7** — Status indicators (depends on Task 2 state)
5. **Task 4** — Dynamic model selection (independent of Task 2)
6. **Task 5** — Job board content fetching (independent)
7. **Task 6** — System prompt review (depends on Task 2 being deployed)
8. **Task 8** — Seed and verify (depends on all above)

Tasks 1, 3, 4, and 5 can be parallelized. Tasks 2 and 7 are sequential. Task 8 is the final integration check.
