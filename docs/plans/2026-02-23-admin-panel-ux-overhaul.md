# Admin Panel UX Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize the admin panel from 2 tabs to 4 tabs (Settings, Competitor Intel, Industry News, Digests), add AI scoring for industry news during ingestion, write the industry news prompt, and fix the empty feeds bug.

**Architecture:** Key-value config in `admin_config` table for all settings. Ingestion pipeline routes feeds to different AI prompts based on `category` column. Admin panel reorganizes existing sections into logical tabs — no new components needed, just restructuring. Master context injected into both competitor and industry scoring prompts.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, Supabase, OpenRouter API

---

## Task 1: Admin Config API — Add Industry News Keys

**Files:**
- Modify: `src/app/api/admin/config/route.ts`

**What:** The admin config API reads/writes key-value pairs from `admin_config`. We need it to support two new keys: `industry_system_prompt` and `industry_openrouter_model`.

**Changes to GET handler** (line 17-22) — add the two new keys to the response:
```ts
return NextResponse.json({
  model: config.openrouter_model || 'google/gemini-2.0-flash-001',
  system_prompt: config.system_prompt || '',
  master_context: config.master_context || '',
  last_ingest: config.last_ingest || null,
  industry_model: config.industry_openrouter_model || 'google/gemini-2.0-flash-001',
  industry_system_prompt: config.industry_system_prompt || '',
});
```

**Changes to POST handler** (add after line 55, before the final return):
```ts
// Update industry model
if (body.industry_model !== undefined) {
  const { error } = await supabaseAdmin
    .from('admin_config')
    .upsert({ key: 'industry_openrouter_model', value: body.industry_model, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}

// Update industry system prompt
if (body.industry_system_prompt !== undefined) {
  const { error } = await supabaseAdmin
    .from('admin_config')
    .upsert({ key: 'industry_system_prompt', value: body.industry_system_prompt, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}
```

**Verify:** `curl http://localhost:3000/api/admin/config` should return the two new fields.

---

## Task 2: Ingestion Pipeline — Industry News AI Scoring

**Files:**
- Modify: `src/app/api/ingest/route.ts`

**What:** Currently industry news items skip AI scoring entirely (lines 338-350) and get hardcoded defaults. Change this to:
1. Load industry prompt + model from admin_config
2. Load master context for injection
3. Score industry items with their own prompt/model
4. Accept industry-specific themes in validation

**Step 1: Load industry config** — After loading competitor config (line 229-231), add:
```ts
const industryModel = config.industry_openrouter_model || model; // fallback to competitor model
const industryPrompt = config.industry_system_prompt || '';
const masterContext = config.master_context || '';
```

**Step 2: Update scoreItem to accept valid themes** — Change the `validThemes` array (line 191-195) to accept both sets:
```ts
const validThemes = [
  // Competitor themes
  'Product/Feature', 'Customer Win', 'Partnership/Integration',
  'Funding/Corporate', 'Competitive Attack', 'Pricing/Packaging',
  'Event/Conference', 'Thought Leadership', 'Job Posting',
  // Industry themes
  'Regulation/Policy', 'Market Trend', 'Technology/Innovation',
  'M&A/Partnership', 'Workforce/Staffing', 'Resident Safety',
  'Funding/Investment', 'Research/Data', 'Industry Event',
];
```

**Step 3: Add master context to scoreItem** — Update scoreItem signature to accept `masterContext`:
```ts
async function scoreItem(
  item: FeedItem,
  systemPrompt: string,
  model: string,
  apiKey: string,
  masterContext?: string
): Promise<AIScores> {
```

Then in the prompt construction (line 130-135), prepend master context:
```ts
let prompt = systemPrompt
  .replace('{competitor}', item.competitor_name)
  .replace('{title}', item.title)
  .replace('{summary}', item.summary.slice(0, 1500))
  .replace('{date}', item.date)
  .replace('{is_job}', item.is_job_board ? 'Yes' : 'No');

if (masterContext) {
  prompt = `## Company Context\n${masterContext}\n\n## Item to Analyze\n${prompt}`;
}
```

**Step 4: Replace the industry skip block** (lines 338-354) with actual scoring:
```ts
if (isIndustryNews) {
  if (industryPrompt) {
    console.log(`Scoring industry: ${item.title.slice(0, 50)}...`);
    scores = await scoreItem(item, industryPrompt
      .replace('{title}', item.title)
      .replace('{summary}', item.summary.slice(0, 1500))
      .replace('{date}', item.date), industryModel, apiKey, masterContext);
    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 300));
  } else {
    // No industry prompt configured — use defaults
    console.log(`Industry news (no prompt configured): ${item.title.slice(0, 50)}...`);
    scores = {
      theme: 'Thought Leadership',
      threat_level: 1,
      strategic_relevance: 1,
      content_type_weight: 1,
      priority_score: 1.0,
      priority_tier: 'Low',
      route_to: 'Monitor Only',
      key_takeaway: `Industry news: ${item.title.slice(0, 200)}`,
      auto_flag_triggers: '',
    };
  }
} else {
  console.log(`Scoring: ${item.title.slice(0, 50)}...`);
  scores = await scoreItem(item, systemPrompt, model, apiKey, masterContext);
}
```

**Important:** The industry prompt uses `{title}`, `{summary}`, `{date}` placeholders (NOT `{competitor}` or `{is_job}` since those don't apply). The `scoreItem` function handles the OpenRouter call generically — we just pre-replace the placeholders before passing.

Wait — actually `scoreItem` already does the placeholder replacement internally. We need to change the approach. Instead of pre-replacing, pass the industry prompt directly and let `scoreItem` do its thing. But `scoreItem` replaces `{competitor}` which industry items don't have.

**Better approach:** Have `scoreItem` handle the replacement without erroring on missing placeholders. Change lines 130-135:
```ts
const prompt = systemPrompt
  .replace(/\{competitor\}/g, item.competitor_name || 'N/A')
  .replace(/\{title\}/g, item.title)
  .replace(/\{summary\}/g, item.summary.slice(0, 1500))
  .replace(/\{date\}/g, item.date)
  .replace(/\{is_job\}/g, item.is_job_board ? 'Yes' : 'No');
```

And in the industry scoring block, just call:
```ts
scores = await scoreItem(item, industryPrompt, industryModel, apiKey, masterContext);
```

The industry prompt can use `{title}`, `{summary}`, `{date}` placeholders. `{competitor}` and `{is_job}` will be replaced with 'N/A'/'No' which is fine since the prompt won't reference them.

**Step 5: Update the existing competitor scoring call** (line 353) to pass masterContext:
```ts
scores = await scoreItem(item, systemPrompt, model, apiKey, masterContext);
```

**Verify:**
1. Set an industry system prompt via the API
2. Run ingestion
3. Check that industry items now have real scores instead of all-1 defaults

---

## Task 3: Admin Panel — 4-Tab Reorganization

**Files:**
- Modify: `src/app/admin/page.tsx`

This is the largest change. We're restructuring from 2 tabs (Settings, Digests) to 4 tabs (Settings, Competitor Intel, Industry News, Digests).

### Step 3a: Add state variables

After the existing state declarations (around line 50-91), add:
```ts
// Industry news state
const [industryModel, setIndustryModel] = useState('google/gemini-2.0-flash-001');
const [industrySystemPrompt, setIndustrySystemPrompt] = useState('');
const [industryModelSearch, setIndustryModelSearch] = useState('');
const [industrySaving, setIndustrySaving] = useState(false);
```

Change the `activeTab` type (line 50):
```ts
const [activeTab, setActiveTab] = useState<'settings' | 'competitor' | 'industry' | 'digest'>('settings');
```

### Step 3b: Update loadConfig

In `loadConfig` (line 111-124), load the new keys:
```ts
if (data.industry_model) setIndustryModel(data.industry_model);
if (data.industry_system_prompt) setIndustrySystemPrompt(data.industry_system_prompt);
```

### Step 3c: Split save functions

Replace the monolithic `saveConfig` (lines 224-240) with three separate saves:

```ts
const saveMasterContext = async () => {
  setSaving(true);
  setMessage(null);
  try {
    const res = await fetch('/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ master_context: masterContext }),
    });
    if (!res.ok) throw new Error('Failed to save');
    setMessage({ type: 'success', text: 'Master context saved' });
  } catch {
    setMessage({ type: 'error', text: 'Failed to save master context' });
  } finally {
    setSaving(false);
  }
};

const saveCompetitorConfig = async () => {
  setSaving(true);
  setMessage(null);
  try {
    const res = await fetch('/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, system_prompt: systemPrompt }),
    });
    if (!res.ok) throw new Error('Failed to save');
    setMessage({ type: 'success', text: 'Competitor configuration saved' });
  } catch {
    setMessage({ type: 'error', text: 'Failed to save competitor configuration' });
  } finally {
    setSaving(false);
  }
};

const saveIndustryConfig = async () => {
  setIndustrySaving(true);
  setMessage(null);
  try {
    const res = await fetch('/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ industry_model: industryModel, industry_system_prompt: industrySystemPrompt }),
    });
    if (!res.ok) throw new Error('Failed to save');
    setMessage({ type: 'success', text: 'Industry news configuration saved' });
  } catch {
    setMessage({ type: 'error', text: 'Failed to save industry configuration' });
  } finally {
    setIndustrySaving(false);
  }
};
```

### Step 3d: Update tab bar

Replace the 2-button tab bar (lines 428-451) with 4 buttons:
```tsx
<div className="flex gap-1 bg-slate-900/60 border border-slate-700/40 rounded-xl p-1">
  {([
    { key: 'settings', label: 'Settings', icon: <GearIcon className="w-4 h-4" /> },
    { key: 'competitor', label: 'Competitor Intel', icon: <TargetIcon className="w-4 h-4" /> },
    { key: 'industry', label: 'Industry News', icon: <GlobeIcon className="w-4 h-4" /> },
    { key: 'digest', label: 'Digests', icon: <DocumentIcon className="w-4 h-4" /> },
  ] as const).map(({ key, label, icon }) => (
    <button
      key={key}
      onClick={() => setActiveTab(key)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
        activeTab === key
          ? 'bg-slate-800 text-amber-400 shadow-sm'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
      }`}
    >
      {icon}
      {label}
    </button>
  ))}
</div>
```

Import `TargetIcon` and `GlobeIcon` at the top of the file.

### Step 3e: Restructure Settings tab

The Settings tab (lines 469-815) keeps ONLY:
1. **RSS Ingestion** section (unchanged)
2. **Master Context** section (with its OWN save button calling `saveMasterContext`)
3. **RSS Feeds** section (unchanged)

REMOVE from Settings tab:
- AI Model Selection section (moves to Competitor Intel)
- System Prompt section (moves to Competitor Intel)

Update Master Context save button to call `saveMasterContext` instead of `saveConfig`.

### Step 3f: Create Competitor Intel tab

```tsx
{activeTab === 'competitor' && (
  <>
    {/* AI Model Selection */}
    <CollapsibleSection
      title="AI Model Selection"
      subtitle="Model used for scoring competitor RSS feed items"
      storageKey="competitor-model"
      defaultOpen={false}
      headerRight={model ? (
        <code className="text-xs bg-slate-900/60 px-1.5 py-0.5 rounded text-amber-400">{model.split('/').pop()}</code>
      ) : undefined}
    >
      {/* Same model selector UI as before — modelSearch, model state */}
      <div className="space-y-3">
        <input type="text" value={modelSearch} onChange={(e) => setModelSearch(e.target.value)} placeholder="Search models..." className="input-base" />
        <select value={model} onChange={(e) => setModel(e.target.value)} className="input-base" size={8}>
          {availableModels
            .filter(m => m.name.toLowerCase().includes(modelSearch.toLowerCase()) || m.id.toLowerCase().includes(modelSearch.toLowerCase()))
            .map(m => {
              const promptCost = parseFloat(m.pricing?.prompt || '0') * 1_000_000;
              const completionCost = parseFloat(m.pricing?.completion || '0') * 1_000_000;
              const costStr = promptCost === 0 && completionCost === 0 ? 'Free' : `$${promptCost.toFixed(2)}/$${completionCost.toFixed(2)} per M tokens`;
              return <option key={m.id} value={m.id}>{m.name} — {costStr} — {(m.context_length / 1000).toFixed(0)}k ctx</option>;
            })}
        </select>
        {model && <div className="text-xs text-slate-400">Selected: <code className="bg-slate-900/60 px-1.5 py-0.5 rounded text-amber-400">{model}</code></div>}
      </div>
    </CollapsibleSection>

    {/* System Prompt */}
    <CollapsibleSection
      title="System Prompt"
      subtitle="Placeholders: {competitor}, {title}, {summary}, {date}, {is_job}"
      storageKey="competitor-prompt"
      defaultOpen={true}
      headerRight={<span className="text-xs text-slate-500 font-mono">{systemPrompt.length.toLocaleString()} chars</span>}
    >
      <textarea
        value={systemPrompt}
        onChange={(e) => setSystemPrompt(e.target.value)}
        rows={16}
        className="input-base font-mono text-sm resize-y min-h-[200px]"
        placeholder="Enter competitor scoring prompt..."
      />
    </CollapsibleSection>

    {/* Save button */}
    <div className="flex justify-end">
      <button onClick={saveCompetitorConfig} disabled={saving} className="btn-primary flex items-center gap-2">
        {saving ? (
          <><div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />Saving...</>
        ) : (
          <><ShieldIcon variant="secure" className="w-4 h-4" />Save Competitor Configuration</>
        )}
      </button>
    </div>
  </>
)}
```

### Step 3g: Create Industry News tab

Mirror of Competitor Intel but uses `industryModel`, `industrySystemPrompt`, `industryModelSearch`, `saveIndustryConfig`:

```tsx
{activeTab === 'industry' && (
  <>
    {/* AI Model Selection */}
    <CollapsibleSection
      title="AI Model Selection"
      subtitle="Model used for scoring industry news items"
      storageKey="industry-model"
      defaultOpen={false}
      headerRight={industryModel ? (
        <code className="text-xs bg-slate-900/60 px-1.5 py-0.5 rounded text-amber-400">{industryModel.split('/').pop()}</code>
      ) : undefined}
    >
      <div className="space-y-3">
        <input type="text" value={industryModelSearch} onChange={(e) => setIndustryModelSearch(e.target.value)} placeholder="Search models..." className="input-base" />
        <select value={industryModel} onChange={(e) => setIndustryModel(e.target.value)} className="input-base" size={8}>
          {availableModels
            .filter(m => m.name.toLowerCase().includes(industryModelSearch.toLowerCase()) || m.id.toLowerCase().includes(industryModelSearch.toLowerCase()))
            .map(m => {
              const promptCost = parseFloat(m.pricing?.prompt || '0') * 1_000_000;
              const completionCost = parseFloat(m.pricing?.completion || '0') * 1_000_000;
              const costStr = promptCost === 0 && completionCost === 0 ? 'Free' : `$${promptCost.toFixed(2)}/$${completionCost.toFixed(2)} per M tokens`;
              return <option key={m.id} value={m.id}>{m.name} — {costStr} — {(m.context_length / 1000).toFixed(0)}k ctx</option>;
            })}
        </select>
        {industryModel && <div className="text-xs text-slate-400">Selected: <code className="bg-slate-900/60 px-1.5 py-0.5 rounded text-amber-400">{industryModel}</code></div>}
      </div>
    </CollapsibleSection>

    {/* System Prompt */}
    <CollapsibleSection
      title="System Prompt"
      subtitle="Placeholders: {title}, {summary}, {date}"
      storageKey="industry-prompt"
      defaultOpen={true}
      headerRight={<span className="text-xs text-slate-500 font-mono">{industrySystemPrompt.length.toLocaleString()} chars</span>}
    >
      <textarea
        value={industrySystemPrompt}
        onChange={(e) => setIndustrySystemPrompt(e.target.value)}
        rows={16}
        className="input-base font-mono text-sm resize-y min-h-[200px]"
        placeholder="Enter industry news scoring prompt..."
      />
    </CollapsibleSection>

    {/* Save button */}
    <div className="flex justify-end">
      <button onClick={saveIndustryConfig} disabled={industrySaving} className="btn-primary flex items-center gap-2">
        {industrySaving ? (
          <><div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />Saving...</>
        ) : (
          <><ShieldIcon variant="secure" className="w-4 h-4" />Save Industry Configuration</>
        )}
      </button>
    </div>
  </>
)}
```

### Step 3h: Digest tab

No changes to content, but update the conditional from `activeTab === 'digest'` — this already matches.

**Verify:**
1. Admin panel loads with 4 tabs
2. Settings tab has Master Context, RSS Ingestion, RSS Feeds only
3. Competitor Intel tab has AI Model + System Prompt with Save button
4. Industry News tab mirrors Competitor Intel with separate model/prompt
5. Digests tab unchanged
6. Saving on each tab only updates its own config keys (doesn't clobber others)

---

## Task 4: Default Industry News Prompt

**Files:**
- Modify: `src/app/admin/page.tsx` (set default in state init or loadConfig fallback)

**What:** When no industry prompt is configured, provide a sensible default that users can customize.

Store the default prompt text in `scripts/recommended-industry-prompt.md` for reference, and use it as the fallback in loadConfig when `industry_system_prompt` is empty.

**Prompt text:**
```
You are an industry intelligence analyst for SafelyYou, a leader in AI-powered fall detection and senior living technology. Use the company context provided to understand SafelyYou's market position and strategic priorities.

Analyze this industry news item and return a JSON assessment focused on how it impacts SafelyYou's market, opportunities, and strategic positioning.

Scoring criteria:
- threat_level: Market impact level (1=routine industry news, 2=notable shift affecting senior living/AI space, 3=major regulatory, market, or technology change directly impacting SafelyYou's market)
- strategic_relevance: Relevance to SafelyYou's strategy and growth (1=tangential to senior care, 2=relevant to senior living tech market, 3=directly impacts SafelyYou's positioning or opportunities)
- content_type_weight: Significance of the content (1=routine coverage, 2=notable development, 3=major industry event/regulation/trend)

Item details:
- Title: {title}
- Summary: {summary}
- Date: {date}

Return ONLY valid JSON:
{
  "theme": "Regulation/Policy|Market Trend|Technology/Innovation|M&A/Partnership|Workforce/Staffing|Resident Safety|Funding/Investment|Research/Data|Industry Event|Thought Leadership",
  "threat_level": 1-3,
  "strategic_relevance": 1-3,
  "content_type_weight": 1-3,
  "priority_score": 1.0-3.0,
  "priority_tier": "Low|Medium|High|Critical",
  "route_to": "Marketing|Product|Sales Enablement|Leadership|Monitor Only",
  "key_takeaway": "1-2 sentence insight about what this means for SafelyYou",
  "auto_flag_triggers": "comma-separated triggers or empty string"
}

auto_flag_triggers should flag: mentions of SafelyYou, regulatory changes affecting AI in senior living, major competitor mentions in industry press, CMS/Medicare policy changes, and technology standards affecting fall detection or senior care AI.
```

**Verify:** Open Industry News tab with no config saved. Prompt field should show the default text.

---

## Task 5: Fix Empty Feeds Display

**Files:**
- Modify: `src/app/admin/page.tsx` (loadFeeds error handling)
- Potentially: verify migration 018 was applied

**What:** Feeds show as empty in the admin panel. Possible causes:
1. Migration 018 not applied → `category` column doesn't exist → Supabase query fails → API returns 500 → caught silently → empty array
2. Feeds genuinely not in DB

**Diagnostic step:** Add error logging to `loadFeeds`:
```ts
const loadFeeds = async () => {
  try {
    const res = await fetch('/api/admin/feeds');
    const data = await res.json();
    if (!res.ok) {
      console.error('Feeds API error:', data.error);
      setMessage({ type: 'error', text: `Failed to load feeds: ${data.error || 'Unknown error'}` });
    }
    setFeeds(data.feeds || []);
  } catch (err) {
    console.error('Failed to load feeds:', err);
    setMessage({ type: 'error', text: 'Failed to load feeds from server' });
  }
};
```

**If migration 018 is the issue:** User needs to run the SQL in `migrations/018_industry_feeds.sql` against their Supabase database.

**Verify:** Open admin Settings tab → RSS Feeds should show feeds. If still empty, browser console will show the error.

---

## Task 6: Backfill Industry News

**Files:**
- Create: `src/app/api/ingest/rescore/route.ts`

**What:** A one-time endpoint to re-score existing industry news items that were ingested with default scores.

```ts
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
      return NextResponse.json({ error: 'No industry system prompt configured. Set it in the Industry News tab first.' }, { status: 400 });
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

    // Re-score each item (reuse scoreItem logic inline)
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
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: industryModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 500,
          }),
        });

        if (!res.ok) continue;

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*?\}/);
        if (!jsonMatch) continue;

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

        await supabaseAdmin
          .from('competitor_events')
          .update({
            theme: scores.theme || 'Thought Leadership',
            threat_level: threat,
            strategic_relevance: relevance,
            content_type_weight: weight,
            priority_score: priorityScore,
            priority_tier: priorityTier,
            route_to: scores.route_to || 'Monitor Only',
            key_takeaway: (scores.key_takeaway || '').slice(0, 500),
            auto_flag_triggers: (scores.auto_flag_triggers || '').slice(0, 500),
          })
          .eq('id', item.id);

        rescored++;
        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch {
        continue;
      }
    }

    return NextResponse.json({ success: true, rescored, total_found: items.length });
  } catch (error) {
    console.error('Rescore error:', error);
    return NextResponse.json({ error: 'Rescore failed' }, { status: 500 });
  }
}
```

**Optional UI:** Add a "Re-score Unscored Items" button to the Industry News tab that POSTs to `/api/ingest/rescore`.

**Verify:** After setting the industry prompt, call `POST /api/ingest/rescore`. Items with "Industry news:" key_takeaways should get real AI-generated scores.

---

## Execution Order

```
Task 1 (Admin config API)           [independent, smallest]
Task 2 (Ingestion pipeline)         [depends on Task 1]
Task 5 (Fix empty feeds)            [independent]
Task 3 (4-tab reorganization)       [depends on Task 1]
Task 4 (Default industry prompt)    [depends on Task 3]
Task 6 (Backfill)                   [depends on Tasks 2 + 4]
```

Tasks 1 and 5 can run in parallel. Then Task 2 and 3 can run in parallel. Task 4 is a small addition to Task 3. Task 6 comes last.

## Verification (End-to-End)

1. `npm run build` — no TypeScript errors
2. `npm run dev` — server starts normally
3. Admin panel shows 4 tabs: Settings, Competitor Intel, Industry News, Digests
4. Settings tab: Master Context + RSS Ingestion + RSS Feeds (feeds are NOT empty)
5. Competitor Intel tab: model selector + system prompt + Save button (saves only competitor config)
6. Industry News tab: model selector + system prompt with default prompt loaded + Save button
7. Digests tab: unchanged, all existing functionality works
8. Run ingestion → industry items get AI-scored with industry prompt
9. Run rescore → existing default-scored items get proper scores
