# Radar: Weekly Intel Digest + Slack Executive Summary — PRD v2

**Author:** Virgil  
**Date:** 2026-02-21  
**Version:** 2.0 — Revised to separate Industry News from Competitor Intel  
**Status:** Pending Approval  

---

## Overview

Radar continuously ingests and scores competitor intel but has no scheduled synthesis or distribution. This feature adds three distinct pipelines:

| Pipeline | Description | Status |
|----------|-------------|--------|
| **A — Competitor Intel** | Existing RSS → threat scoring → `competitor_events` table | Exists; enhance for digest |
| **B — Industry News** | New RSS feeds → relevance scoring → `industry_news` table | New, separate from A |
| **C — Weekly Executive Summary** | Pulls from A + B → AI narrative → Slack | New |

**Key Design Decision:** Industry news is a completely separate pipeline from competitor tracking. They live in separate tables, use separate AI prompts, and appear in separate UI tabs. The executive summary is the only place they merge.

---

## Problem

- Leadership has no regular competitive intelligence touchpoint — Radar ingests data nobody sees
- Current digest pulls only competitor events, missing broader industry context
- Industry news was previously mixed into the competitor feed — wrong framing, wrong prompt, wrong table
- No scheduled distribution; no Slack channel receives the output
- Executive-readable narrative doesn't exist — current output is a raw scored list

---

## Solution

### Pipeline A — Competitor Intel (Existing, Enhance for Digest)

No new ingestion needed. `ingest.py` already fetches 9 RSS feeds (6 content, 3 job boards) for CarePredict, VirtuSense, Sage, Nobi, Inspiren, and Amba. Items are scored with threat level (1-3), strategic relevance (1-3), content type weight (1-3), and routed to Marketing / Product / Sales Enablement / Leadership / Monitor Only.

**Enhancement for Weekly Digest:**
- The `generateDigest()` function in `lib/digest.ts` already queries `competitor_events` from the past 7 days
- Add a `slack_posted` boolean and `slack_ts` column to `weekly_digests` (see Schema section)
- The digest job will pull top competitor events and pass them to the AI with the SafelyYou Master Context

### Pipeline B — Industry News (New, Separate)

A new parallel ingestion track for senior living industry news. This is NOT competitor monitoring — it's sector context.

**New RSS Feeds:**

| Source | Feed URL |
|--------|----------|
| McKnight's Senior Living | `https://www.mcknightsseniorliving.com/feed/` |
| Senior Housing News | `https://seniorhousingnews.com/feed/` |
| LeadingAge | `https://leadingage.org/feed/` |
| Argentum | `https://www.argentum.org/feed/` |
| McKnight's LTC News | `https://www.mcknightsltc.com/feed/` |

**New `industry_news` table** (see Schema section) — fully separate from `competitor_events`.

**New ingestion script** `ingest_industry.py`:
- Fetches feeds above
- Deduplicates via URL hash against `industry_news` table
- Scores each item with a **separate AI prompt** (relevance-focused, not threat-focused)
- Stores in `industry_news` with `relevance_tier`: Major / Notable / Background

**Relevance Scoring for Industry News:**
Uses a SafelyYou Industry Context file (see Context File section below) to rate items:

| Tier | Meaning |
|------|---------|
| **Major** | Directly affects SafelyYou's market — regulatory changes, REIT/capital partner moves, key customer system changes, fall prevention mandates, major acquisitions, large funding rounds in adjacent space |
| **Notable** | Relevant context — technology adoption trends, staffing crisis updates, reimbursement changes, conference/association announcements, key customer mentions |
| **Background** | General industry news — interesting but not action-triggering |

Only **Major** and **Notable** items surface in the weekly executive summary. All items appear in the Industry News tab.

**Important:** Industry news items do NOT get threat scoring, route_to, or key_takeaway in the competitor framing. They get a `relevance_summary` — a 1-2 sentence note on why this matters to SafelyYou.

### Pipeline C — Weekly Executive Summary (New)

Runs **Monday at 8am PST** (cron: `0 8 * * 1` PST = `0 16 * * 1` UTC).

**Trigger:** `POST /api/digest/run`

**Process:**
1. Pull `competitor_events` from past 7 days (ordered by priority_score desc, limit 40)
2. Pull `industry_news` where `relevance_tier IN ('Major', 'Notable')` from past 7 days
3. Load `SafelyYou_Master_Context_v2.md` + `SafelyYou_Industry_Context.md`
4. Generate AI narrative summary with two named sections
5. Save to `weekly_digests` table
6. Post to Slack via Block Kit

**Output Format:**

```
🔍 SafelyYou Competitive Intel — Week of [DATE]

━━━━━━━━━━━━━━━━━━━━━━━
🎯 SECTION 1: COMPETITIVE INTEL
━━━━━━━━━━━━━━━━━━━━━━━

Top Story: [Most significant competitive development + SafelyYou response]

This Week's Activity:
• [Competitor]: [X events, Y High/Critical] — [one-liner insight]
• [Competitor]: [X events] — [one-liner insight]

So What for Sales: [2-3 sentences on what this means for SafelyYou this week]

━━━━━━━━━━━━━━━━━━━━━━━
🏭 SECTION 2: INDUSTRY NEWS
━━━━━━━━━━━━━━━━━━━━━━━

Major Developments:
• [Item 1 — source, relevance note]
• [Item 2 — source, relevance note]

Notable:
• [Item 3]
• [Item 4]

Industry Pulse: [1-2 sentences on broader market context]
```

**Slack Distribution:**
- Bot token: `SLACK_BOT_TOKEN` env var
- Channel: `SLACK_INTEL_CHANNEL_ID` env var
- Format: Slack Block Kit (falls back to plain text)
- On failure: logs error, writes digest to DB anyway, does not crash

---

## Context File Specification

### Existing: `SafelyYou_Master_Context_v2.md`
Already used in competitor digest. Contains SafelyYou positioning, proof points, competitor profiles. **No changes needed.**

### New: `SafelyYou_Industry_Context.md` ← **Treynor must create this**

This file tells the AI how to rate industry news relevance for SafelyYou specifically. Template:

```markdown
# SafelyYou Industry Context

## Largest Customers (watch for mentions)
- [Customer Name] — [# communities, region, relationship notes]
- [Customer Name] — ...
(List top 10-15 accounts)

## Key Capital Partners / REITs (watch for moves)
- Welltower
- Ventas
- Sabra Health Care REIT
- NHI (National Health Investors)

## What Industry News Matters to SafelyYou

### MAJOR (always surface)
- Fall prevention regulations or mandates (CMS, state-level)
- Memory care reimbursement changes
- REIT acquisition of SafelyYou customer communities
- Technology mandates in senior living (federal or state)
- Large funding rounds ($50M+) in adjacent AI/safety tech
- Major senior living chain bankruptcies or consolidations

### NOTABLE (surface if specific)
- Staffing crisis updates (affects selling motion)
- LeadingAge / Argentum policy positions on AI in care
- New AI adoption surveys / industry reports
- Conference themes and attendance (NIC, LeadingAge, Argentum Summit)
- Customer mentions in trade press
- Workforce/training trends affecting memory care operators

### BACKGROUND (ingest, don't surface in digest)
- General senior living business news
- International market news
- Skilled nursing facility-only news (not AL/MC)
- Generic technology trend articles

## SafelyYou's Core Market
Memory care and assisted living communities. Our buyers are VP of Operations, COO, CMO at senior living operators. 
Key business drivers: fall reduction ROI, staff efficiency, CMS compliance, family trust, competitive differentiation.
```

**Blocker:** Treynor needs to create `SafelyYou_Industry_Context.md` at the Radar repo root before Pipeline B scoring will be useful. A generic fallback prompt will be used until then.

---

## Technical Architecture

### New Files

| File | Purpose |
|------|---------|
| `ingest_industry.py` | Pipeline B — industry news ingestion + relevance scoring |
| `lib/slack.ts` | Slack Block Kit formatter + posting (token from env) |
| `app/api/digest/run/route.ts` | Manual trigger (already exists? if not, create) |
| `app/api/industry/route.ts` | GET industry news with filters (tier, date, source) |
| `app/industry/page.tsx` | New Industry News tab in UI |
| `SafelyYou_Industry_Context.md` | Context file for industry relevance scoring (Treynor creates) |
| `migrations/020_industry_news.sql` | DB migration for `industry_news` table |
| `migrations/021_digest_slack_columns.sql` | Adds `slack_posted`, `slack_ts` to `weekly_digests` |

### Existing Files to Modify

| File | Change |
|------|--------|
| `src/components/Nav.tsx` | Add "Industry" nav link (between Analytics and Intel) |
| `src/lib/digest.ts` | Add industry news section to digest generation |
| `supabase-schema.sql` | Add `industry_news` table, update `weekly_digests` |

---

## Database Schema

### New Table: `industry_news`

```sql
CREATE TABLE industry_news (
    id SERIAL PRIMARY KEY,

    -- Core fields (from RSS)
    url_hash TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    summary TEXT,
    published_at TIMESTAMPTZ,
    source_name TEXT NOT NULL,        -- e.g. "McKnight's Senior Living"
    feed_url TEXT,                    -- Source feed URL

    -- AI-scored fields
    relevance_tier TEXT CHECK(relevance_tier IN ('Major', 'Notable', 'Background')),
    relevance_summary TEXT,           -- 1-2 sentences: why this matters to SafelyYou
    topics TEXT[],                    -- e.g. ['fall-prevention', 'regulation', 'funding']
    mentioned_accounts TEXT[],        -- SafelyYou customer names found in article

    -- User interaction
    is_read BOOLEAN DEFAULT FALSE,
    is_actioned BOOLEAN DEFAULT FALSE,
    notes TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_industry_tier ON industry_news(relevance_tier);
CREATE INDEX idx_industry_published ON industry_news(published_at DESC);
CREATE INDEX idx_industry_source ON industry_news(source_name);
CREATE INDEX idx_industry_unread ON industry_news(is_read) WHERE is_read = FALSE;

ALTER TABLE industry_news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON industry_news FOR SELECT USING (true);
CREATE POLICY "Allow service write" ON industry_news FOR ALL USING (true);
```

### Modified Table: `weekly_digests` (add columns)

```sql
ALTER TABLE weekly_digests
    ADD COLUMN IF NOT EXISTS industry_news_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS industry_breakdown JSONB,
    ADD COLUMN IF NOT EXISTS slack_posted BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS slack_ts TEXT,  -- Slack message timestamp (for threading)
    ADD COLUMN IF NOT EXISTS slack_error TEXT;
```

---

## UI Changes

### New Tab: Industry News (`/industry`)

A new page at `app/industry/page.tsx` mirroring the Command Center layout but for industry news:

- **Filter bar:** Source (McKnight's / SHN / LeadingAge / Argentum / McKnight's LTC), Relevance Tier (Major / Notable / Background), Date range
- **Stats row:** Total this week, Major count, Notable count, Background count
- **Feed:** Cards showing title, source, relevance tier badge, relevance summary, published date, link to article
- **No threat scoring UI** — this is not competitor monitoring

### Nav Update

Add "Industry" link to `Nav.tsx`:

```typescript
const links = [
  { href: '/', label: 'Command', icon: CommandIcon },
  { href: '/stats', label: 'Analytics', icon: AnalyticsIcon },
  { href: '/industry', label: 'Industry', icon: GlobeIcon },   // NEW
  { href: '/digest', label: 'Intel', icon: DocumentIcon },
  { href: '/admin', label: 'Control', icon: GearIcon },
];
```

### Digest Page Update (`/digest`)

Update the digest view to show both sections of the executive summary separately:
- Section 1: Competitive Intel (collapsible)
- Section 2: Industry News (collapsible)
- Metadata: Slack posted status, timestamp, event counts from both pipelines

---

## Environment Variables Required

```
# Slack (BLOCKERS — needed before Slack posting works)
SLACK_BOT_TOKEN=          # Bot OAuth token — Treynor provides via Telegram DM
SLACK_INTEL_CHANNEL_ID=   # Target channel ID — Treynor creating channel

# Already set — used for competitor scoring and digest generation
OPENROUTER_API_KEY=       # Already in Railway env vars
OPENAI_API_KEY=           # Already in Railway env vars (fallback)

# Already set — Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

**No API keys or tokens are hardcoded anywhere in the codebase. All credentials via Railway environment variables.**

---

## Blockers (Need from Treynor)

| Item | Status | Notes |
|------|--------|-------|
| `SLACK_BOT_TOKEN` | ⛔ **BLOCKER** | Send via Telegram DM — will add to Railway env vars |
| `SLACK_INTEL_CHANNEL_ID` | ⛔ **BLOCKER** | Create the Slack channel, then copy channel ID |
| `SafelyYou_Industry_Context.md` | ⚠️ **Required for good scoring** | Treynor writes; template above. Without it, generic scoring only |

Everything else can be built and tested locally. Slack posting fails gracefully (logs error, digest still saves) until credentials are set.

---

## Implementation Order

1. **DB migration** — Add `industry_news` table, update `weekly_digests` schema
2. **`ingest_industry.py`** — Pipeline B ingestion with relevance scoring
3. **`/industry` page** — New UI tab with filters + feed
4. **Nav update** — Add Industry link
5. **`lib/slack.ts`** — Slack formatter + poster
6. **`lib/digest.ts` update** — Pull from both tables, two-section output
7. **Cron job** — Monday 8am PST POST to `/api/digest/run`
8. **Test without Slack** — Verify digest generates correctly with both sections
9. **Add Slack creds** — Once Treynor provides token + channel ID
10. **End-to-end test** — Trigger manually, verify Slack post

---

## Out of Scope

- Mixing industry news into `competitor_events` (explicitly NOT doing this)
- Threat scoring for industry news (different framing — relevance, not threat)
- Slack thread replies or reactions
- Per-user DM delivery
- Email digest
- Real-time Slack alerts for HIGH threat competitor events (separate PRD item)
- Industry news in the main Command Center feed

---

## Success Criteria

- Every Monday morning, SafelyYou Slack channel receives a structured executive summary with **two clearly labeled sections** (Competitive Intel / Industry News)
- Industry News tab shows a clean, filterable feed of senior living news separate from the competitor feed
- Summary generates in < 45 seconds
- Zero API keys or tokens in codebase — all via Railway env vars
- Digest history queryable at `/api/digest`
- Industry news history queryable at `/api/industry`
- Both pipelines ingest independently on separate schedules

---

## Tech Stack Reference (for implementer)

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API routes (app/api/**/route.ts)
- **Database:** Supabase (PostgreSQL) — accessed via `supabaseAdmin` (service role) from API routes
- **Ingestion:** Python scripts (`ingest.py` for competitors, new `ingest_industry.py` for industry)
- **AI Scoring:** OpenRouter API — model `google/gemini-2.0-flash-001`
- **Deployment:** Railway (Next.js app) + Railway cron for digest job
- **Auth:** Supabase Auth with email/password
