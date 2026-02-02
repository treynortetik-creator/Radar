# 🎯 Radar Dashboard

Competitive intelligence dashboard for SafelyYou. Displays scored competitor events with filtering, competitor profiles, and analytics.

## Quick Start

```bash
cd dashboard
npm install
npm run dev
# Open http://localhost:3001
```

The dashboard reads from `../competitor_radar.db` (SQLite) via API routes. No external database needed for local development.

## Architecture

- **Next.js 16** with App Router, TypeScript, Tailwind CSS v4
- **SQLite** via `better-sqlite3` (readonly) for API routes
- **Recharts** for data visualization
- Dark theme with competitor/tier color coding

## Pages

| Route | Description |
|-------|-------------|
| `/` | Main dashboard — events sorted by priority, filterable |
| `/competitor/[slug]` | Per-competitor profile with threat distribution |
| `/stats` | Analytics — charts for competitors, themes, priorities |

## API Routes

| Endpoint | Params | Description |
|----------|--------|-------------|
| `GET /api/events` | `competitor`, `tier`, `theme`, `search`, `limit`, `offset` | Filtered events list |
| `GET /api/competitors` | — | Competitor summary with counts |
| `GET /api/stats` | — | Aggregate statistics |

## Supabase Migration (Future)

1. Create a Supabase project
2. Run `supabase-schema.sql` in SQL Editor
3. Set environment variables and run migration:
   ```bash
   export SUPABASE_URL=https://your-project.supabase.co
   export SUPABASE_KEY=your-service-role-key
   python migrate-to-supabase.py
   ```
4. Update `.env.local` with Supabase credentials
5. Swap API routes to use `@supabase/supabase-js` instead of `better-sqlite3`

## Environment Variables

Copy `.env.local.example` or create `.env.local`:
```
# For Supabase (when migrated)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Current: SQLite path (relative to dashboard/)
DB_PATH=../competitor_radar.db
```

## Color Coding

**Priority Tiers:** Critical (🔴), High (🟠), Medium (🟡), Low (🟢)

**Competitors:** Inspiren (#CC4125), Sage (#B4A7D6), VirtuSense (#9900FF), Amba (#FF9900), Nobi (#B7E1CD), CarePredict (#F9CB9C)
