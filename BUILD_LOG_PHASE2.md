# Radar — Phase 2 Build Log

## Date: 2026-02-01

## What Was Built

### Next.js Dashboard (`dashboard/`)
- **Framework:** Next.js 16 with App Router, TypeScript, Tailwind CSS v4
- **Data Layer:** SQLite via `better-sqlite3` (readonly) — reads from `../competitor_radar.db`
- **Charts:** Recharts for bar charts and pie charts
- **Design:** Dark theme (slate-900 base), mobile responsive

### Pages
1. **Main Dashboard** (`/`) — All 200 events with priority sorting (Critical → Low), search, filters for competitor/tier/theme, expandable event cards with full details
2. **Competitor Profiles** (`/competitor/[slug]`) — Per-competitor view with threat distribution bar, stats (avg priority, threat rate, latest event), and event timeline
3. **Stats/Overview** (`/stats`) — Four charts: events by competitor, priority distribution pie, events by theme, route distribution

### API Routes
- `GET /api/events` — Filterable, paginated events
- `GET /api/competitors` — Competitor summaries with tier counts
- `GET /api/stats` — Aggregate statistics for charts

### Components
- `EventCard` — Expandable card with tier/competitor badges, key takeaway, scores, source link
- `TierBadge` — Color-coded priority tier indicator
- `CompetitorBadge` — Competitor name with brand color
- `Nav` — Top navigation with active state

## Supabase Status: NOT YET SET UP

### Reason
No Supabase CLI installed, and creating a project requires account authentication (dashboard login or management API token).

### What's Ready for Migration
- `supabase-schema.sql` — PostgreSQL schema adapted from SQLite (with RLS policies)
- `migrate-to-supabase.py` — Script to bulk-migrate SQLite → Supabase
- Dashboard API routes are simple enough to swap to `@supabase/supabase-js` in ~30 minutes

### To Complete Supabase Setup
1. Treynor creates Supabase project at https://supabase.com/dashboard
2. Run `supabase-schema.sql` in SQL Editor
3. Copy project URL + anon key to `.env.local`
4. Run `migrate-to-supabase.py` with service role key
5. Swap API routes from `better-sqlite3` to Supabase client

## How to Run
```bash
cd ~/.clawdbot/workspace/Radar/dashboard
npm install
npm run dev -- -p 3001
# Open http://localhost:3001
```

Note: Port 3000 is occupied by another app (War Room). Use 3001.

## Next Steps
- [ ] Set up Supabase project (needs Treynor's account)
- [ ] Migrate data + swap API routes
- [ ] Update `ingest.py` to write to Supabase
- [ ] Deploy to Vercel (or similar)
- [ ] Add date range filter
- [ ] Add auto-refresh / real-time updates via Supabase subscriptions
