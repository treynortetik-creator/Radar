# CompetitorRadar — Phase 1 Build Log

**Date:** 2026-02-01
**Builder:** Virgil (Clawdbot)
**Status:** ✅ Phase 1 Complete (Foundation + Ingestion)

---

## What Was Built

### 1. RSS Ingestion Pipeline (`ingest.py`)
A Python script that:
- Fetches all **9 RSS feeds** (6 content + 3 job board) from rss.app
- Parses each item: title, URL, summary, date, competitor
- **Deduplicates** by SHA256 hash of URL (prevents re-processing)
- Sends each item to **OpenRouter API** (Gemini 2.0 Flash) for AI scoring
- Scores using the **exact rubric from the Zapier instructions**:
  - Theme categorization (9 categories)
  - Threat Level (1-3)
  - Strategic Relevance (1-3)
  - Content Type Weight (1-3)
  - Priority Score (average of three scores)
  - Priority Tier (Low/Medium/High/Critical)
  - Auto-Flag Triggers (overrides to Critical when found)
  - Route To (Marketing/Product/Sales Enablement/Leadership/Monitor Only)
  - Key Takeaway (1-2 sentences)
- Stores results in **SQLite** database (`competitor_radar.db`)
- Appends rows to the **Google Sheet** via `gog sheets` CLI

### 2. Database Schema (`schema.sql`, `competitor_radar.db`)
SQLite database with:
- Full schema matching all PRD + Zapier instruction fields
- Indexes on url_hash, competitor, priority_tier, published_at, threat_level
- Views: `high_priority_events`, `unsynced_events`
- `synced_to_sheet` flag for tracking what's been written

### 3. Master Context Integration
The scoring prompt includes condensed SafelyYou context from `SafelyYou_Master_Context_v2.md`:
- SafelyYou products, proof points, and key differentiators
- Competitor profiles (Inspiren, Sage, Nobi, Amba, CarePredict, VirtuSense)
- Enables more accurate key takeaways that reference SafelyYou's positioning

### 4. Google Sheet Integration
- Uses `gog sheets append` with INSERT_ROWS to add data to the existing tracking sheet
- Sheet ID: `1pF9snpvfmIXtVlzj7ets0zgQtzJH90OjIzFChgTnF-8`
- Matches the exact 13-column format: Title, URL, Summary, Date, Competitor, Theme, Threat Level, Strategic Relevance, Content Type Weight, Priority Tier, Route to, Key Takeaway, Auto-Flag Triggers

---

## Initial Run Results

| Metric | Value |
|--------|-------|
| Total RSS items | 200 |
| New (after dedup) | 200 |
| Stored in SQLite | 200 |
| Written to Sheet | 200 |
| Cost estimate | ~$0.02 (Gemini 2.0 Flash is extremely cheap) |
| Run time | ~12 minutes (API rate-limited) |

### Priority Breakdown
| Tier | Count |
|------|-------|
| Low | 109 |
| Medium | 64 |
| Critical | 27 |

### By Competitor
| Competitor | Items |
|------------|-------|
| Inspiren | 50 (25 content + 25 jobs) |
| Sage | 50 (25 content + 25 jobs) |
| Nobi | 34 (14 content + 20 jobs) |
| VirtuSense | 25 |
| CarePredict | 21 |
| Amba | 20 |

### Notable Critical Items Flagged
1. **Sage ↔ Sonida** — Customer testimonial at Sonida (a SafelyYou account). Trigger: SafelyYou customer win.
2. **Sage ↔ Avista** — Caregiver spotlight at Avista (a SafelyYou account). Trigger: SafelyYou customer overlap.
3. **VirtuSense vs cameras** — Multiple posts directly attacking camera-based solutions (SafelyYou's core tech).
4. **CarePredict + Kami Vision** — Partnership claiming "industry's first unified fall detection" experience.
5. **Inspiren "first ever ecosystem with eCall"** — Direct "first" claim in eCall.
6. **VirtuSense predictive AI** — Positioning predictive fall prevention as superior to reactive detection.

---

## Known Limitations

### Google Sheet Row Ordering
- **Issue:** The `gog sheets append` CLI always adds rows to the **bottom** of the sheet, not row 2 like the Zapier flow did.
- **Cause:** Google Sheets API `append` finds the last data row and appends after it, regardless of the range specified. True row-2 insertion requires `batchUpdate` with `insertDimension`, which `gog` doesn't support.
- **Workaround:** Sort the sheet by Date (descending) to see newest items first.
- **Future fix:** Use Google Sheets API directly via Python (`google-api-python-client`) for proper row insertion, or build a Supabase Edge Function that handles this.

### Auto-Flag Trigger Sensitivity
- Some job postings get flagged with "Staffing AI" trigger because job descriptions mention AI/ML roles. This is technically correct (it signals competitor investment in AI) but inflates the Critical count for job posts.
- **Future fix:** Add logic to downweight auto-flag triggers for job postings, or separate the job board scoring rubric.

### No Supabase Yet
- Supabase requires authentication/project creation that needs Treynor's credentials.
- SQLite is the current data store. Migration path to Supabase is straightforward.
- Schema is already defined in `schema.sql` and can be applied directly to Postgres.

---

## Usage

```bash
cd ~/.clawdbot/workspace/CompetitorRadar
source .venv/bin/activate

# Run full pipeline (fetch, score, store, write to sheet)
PYTHONUNBUFFERED=1 python ingest.py

# Dry run (no writes to sheet)
python ingest.py --dry-run

# Single feed only
python ingest.py --feed "CarePredict"

# Check the database
sqlite3 competitor_radar.db "SELECT competitor, priority_tier, title FROM competitor_events WHERE priority_tier = 'Critical'"
```

---

## Next Steps

### Immediate (Phase 1 Completion)
- [ ] **Supabase project** — Treynor to create project and share URL + service role key
- [ ] **Schema migration** — Apply `schema.sql` to Supabase Postgres
- [ ] **Dual-write** — Update ingest.py to write to both SQLite and Supabase

### Phase 2 (Dashboard + Scheduling)
- [ ] **Cron scheduling** — Run ingest.py every 30 minutes via launchd or cron
- [ ] **News/industry RSS** — Add general industry feeds (McKnight's, SHN, etc.)
- [ ] **Next.js dashboard** — Event list, filters, competitor profiles
- [ ] **Morning brief integration** — Surface Critical items in daily briefs

### Phase 3 (Alerts + Intelligence)
- [ ] **Telegram alerts** for Critical items
- [ ] **Weekly competitor summary** — AI-generated weekly digest
- [ ] **Trend analysis** — Track competitor activity volume over time
- [ ] **FlightLog integration** — Surface relevant intel during sales prep

---

## File Inventory

| File | Purpose |
|------|---------|
| `ingest.py` | Main ingestion pipeline |
| `schema.sql` | Database schema (SQLite/Postgres compatible) |
| `competitor_radar.db` | SQLite database (200 items) |
| `.venv/` | Python virtual environment |
| `PRD.md` | Product requirements document |
| `zapier-instructions.md` | Original Zapier scoring rubric |
| `SafelyYou_Master_Context_v2.md` | SafelyYou knowledge base for AI scoring |
| `BUILD_LOG.md` | This file |
