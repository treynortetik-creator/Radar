# Analytics Page Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three new visualizations to the analytics page: trend-over-time area chart, industry news summary card, and competitor×theme heatmap. Also filter "Industry News" pseudo-competitor from all existing charts.

**Architecture:** Extend the existing `/api/stats` endpoint to return additional aggregated data (weekly timeline, industry news count, competitor-theme matrix). Build new chart components in the stats page using recharts AreaChart and a custom CSS-grid heatmap. Keep all logic server-side in the API route; frontend is pure presentation.

**Tech Stack:** Next.js API routes, Supabase (supabaseAdmin), recharts (AreaChart, Area, Tooltip), Tailwind CSS

---

### Task 1: Stats API — Add Industry News Count & Competitor-Theme Matrix

**Files:**
- Modify: `src/app/api/stats/route.ts`

**Changes:**
1. Add a separate Supabase query to `industry_news` table for total count and source breakdown
2. Aggregate competitor×theme matrix from existing `allEvents` data
3. Reshape timeline data into weekly buckets with total counts per week
4. Return new fields: `industryNewsCount`, `industryNewsSources`, `competitorThemeMatrix`, `weeklyTimeline`

### Task 2: Stats Page — Update Interface & Add Industry News Card

**Files:**
- Modify: `src/app/stats/page.tsx`

**Changes:**
1. Update `StatsData` interface with new API fields
2. Add a 5th stat card for "Industry Articles" with a newspaper icon
3. Adjust grid to `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`
4. Add a `NewspaperIcon` to icons

### Task 3: Stats Page — Trend Over Time Area Chart

**Files:**
- Modify: `src/app/stats/page.tsx`

**Changes:**
1. Import `AreaChart`, `Area`, `Legend` from recharts
2. Add a full-width chart card above the existing 2-col grid
3. Render stacked area chart with one area per competitor, using existing `COMPETITOR_COLORS`
4. Weekly buckets on X-axis, event count on Y-axis

### Task 4: Stats Page — Competitor × Theme Heatmap

**Files:**
- Modify: `src/app/stats/page.tsx`

**Changes:**
1. Build a custom grid-based heatmap component
2. Competitors on rows, themes on columns
3. Color intensity based on event count (darker = more events)
4. Tooltip on hover showing exact count
5. Replace the Intelligence Routing chart (moved below) or add as a new full-width section

### Task 5: Build, Test & Commit

Run `npm run build` to verify no TypeScript/build errors. Visual test on dev server. Commit and push.
