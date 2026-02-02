# CompetitorRadar — Product Requirements Document

**Author:** Virgil + Treynor  
**Created:** 2026-01-27  
**Status:** Draft  

---

## Overview

### Problem Statement
SafelyYou's competitive intelligence is currently being dumped into a Google Sheet via RSS feeds. This data sits unused — no alerts, no synthesis, no easy access for sales/leadership. Meanwhile, competitors are making moves that go unnoticed until it's too late.

### Solution
A standalone dashboard that aggregates competitive intelligence, surfaces actionable insights, and optionally integrates with FlightLog for contextual competitor mentions during sales conversations.

### Target Users
- **Primary:** Treynor (maintaining intel), Sales team (using intel)
- **Secondary:** Leadership (strategic decisions), Marketing (positioning)

---

## Goals & Success Metrics

| Goal | Metric |
|------|--------|
| Surface competitor moves faster | Time from event → alert < 1 hour |
| Make intel accessible | Weekly active users > 5 |
| Reduce manual monitoring | Treynor time spent on intel tracking -80% |
| Inform sales conversations | Intel cited in 20%+ of call prep |

---

## Features

### MVP (v1.0)

#### 1. RSS Feed Ingestion
- Connect existing RSS feeds (already set up)
- Ingest into Supabase `competitor_events` table
- Run on schedule (every 15-30 min)
- Dedupe by URL/title hash

#### 2. Event Dashboard
- List view of recent competitor events
- Filter by: competitor, date range, category
- Categories: Product, Funding, Partnership, Hiring, News, Customer Win
- Search across all events

#### 3. Threat Scoring
- Auto-classify events by threat level (High/Medium/Low)
- Based on rules from Master Context (Section G3):
  - HIGH: Direct SafelyYou mentions, feature claims, major REIT deals
  - MEDIUM: Product announcements, case studies, conference presence
  - LOW: Thought leadership, hiring, international focus

#### 4. Alerts
- Telegram notification for HIGH threat events
- Daily digest for MEDIUM events
- Weekly summary for all activity

#### 5. Competitor Profiles
- One page per competitor with:
  - Company info (from Master Context)
  - Recent events timeline
  - Threat score trend
  - Key weaknesses / SafelyYou responses

### Future (v2.0+)

- FlightLog integration (surface relevant intel during call prep)
- Slack integration for sales team alerts
- AI summarization of competitor patterns
- Win/loss correlation analysis
- Automated sales battlecard updates

---

## Technical Architecture

### Stack
- **Frontend:** Next.js (consistent with FlightLog)
- **Backend:** Supabase (Postgres + Edge Functions)
- **Ingestion:** Supabase Edge Function on cron
- **Alerts:** Clawdbot webhook or Supabase → Telegram

### Database Schema

```sql
-- Competitors (static reference data)
CREATE TABLE competitors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  website TEXT,
  headquarters TEXT,
  founded TEXT,
  employees TEXT,
  description TEXT,
  weaknesses TEXT[],
  products TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSS Feeds
CREATE TABLE feeds (
  id SERIAL PRIMARY KEY,
  competitor_id INTEGER REFERENCES competitors(id),
  url TEXT NOT NULL,
  name TEXT,
  last_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitor Events (ingested from RSS)
CREATE TABLE competitor_events (
  id SERIAL PRIMARY KEY,
  feed_id INTEGER REFERENCES feeds(id),
  competitor_id INTEGER REFERENCES competitors(id),
  title TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  url_hash TEXT UNIQUE NOT NULL,
  published_at TIMESTAMPTZ,
  summary TEXT,
  category TEXT, -- product, funding, partnership, hiring, news, customer_win
  threat_level TEXT, -- high, medium, low
  threat_reasons TEXT[],
  is_read BOOLEAN DEFAULT FALSE,
  is_actioned BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_events_competitor ON competitor_events(competitor_id);
CREATE INDEX idx_events_threat ON competitor_events(threat_level);
CREATE INDEX idx_events_published ON competitor_events(published_at DESC);
```

### Ingestion Flow

```
┌─────────────┐    ┌──────────────────┐    ┌──────────────┐
│  RSS Feeds  │───▶│ Supabase Edge Fn │───▶│   Postgres   │
└─────────────┘    │  (every 15 min)  │    └──────────────┘
                   │                  │           │
                   │  - Fetch feeds   │           │
                   │  - Parse items   │           ▼
                   │  - Dedupe        │    ┌──────────────┐
                   │  - Score threat  │    │   Frontend   │
                   │  - Insert        │    │  Dashboard   │
                   └──────────────────┘    └──────────────┘
                           │
                           ▼
                   ┌──────────────────┐
                   │  Alert (if HIGH) │
                   │  via Telegram    │
                   └──────────────────┘
```

---

## UI Wireframes

### Dashboard (Main View)
```
┌─────────────────────────────────────────────────────────────┐
│  CompetitorRadar                        [Search] [Filters]  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🔴 HIGH THREAT (3 new)                                  ││
│  │ ─────────────────────────────────────────────────────── ││
│  │ • CarePredict announces bathroom monitoring feature     ││
│  │   2 hours ago · Product · [View] [Mark Read]           ││
│  │ • PalCare wins Welltower deal for 50 communities       ││
│  │   5 hours ago · Customer Win · [View] [Mark Read]      ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🟡 MEDIUM THREAT (12 this week)                         ││
│  │ ─────────────────────────────────────────────────────── ││
│  │ • Securitas exhibiting at NIC Spring · Conference      ││
│  │ • VirtuSense case study: 30% fall reduction · Content  ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Competitors: [CarePredict] [PalCare] [Securitas] [RFT]...  │
└─────────────────────────────────────────────────────────────┘
```

### Competitor Profile
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back                                     CarePredict     │
├─────────────────────────────────────────────────────────────┤
│  Threat Score: ████████░░ 78/100 (trending up ↑)           │
│                                                             │
│  Products: Wearables, predictive analytics, fall prevention│
│  Weaknesses: Relies on wearables, limited accuracy         │
│                                                             │
│  SafelyYou Response:                                        │
│  "Only fully ambient solution — no wearables, no lanyards" │
├─────────────────────────────────────────────────────────────┤
│  Recent Events                                              │
│  ─────────────────────────────────────────────────────────  │
│  🔴 Jan 27 · Bathroom monitoring announcement              │
│  🟡 Jan 20 · LeadingAge booth registration                 │
│  🟢 Jan 15 · New VP Sales hire                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Foundation (Day 1)
- [ ] Set up Supabase project
- [ ] Create database schema
- [ ] Seed competitor data from Master Context
- [ ] Import existing RSS feeds

### Phase 2: Ingestion (Day 1-2)
- [ ] Build RSS fetcher Edge Function
- [ ] Implement threat scoring logic
- [ ] Set up cron schedule
- [ ] Test with real feeds

### Phase 3: Dashboard (Day 2-3)
- [ ] Next.js project setup
- [ ] Event list view with filters
- [ ] Competitor profile pages
- [ ] Search functionality

### Phase 4: Alerts (Day 3)
- [ ] Telegram webhook for HIGH threats
- [ ] Daily digest cron
- [ ] Mark read/actioned functionality

### Phase 5: Polish (Day 4+)
- [ ] Mobile responsive
- [ ] Threat score trends
- [ ] Export functionality
- [ ] Documentation

---

## Open Questions

1. **Where are the current RSS feeds?** (Google Sheet link?)
2. **Who else needs access?** (Just Treynor or sales team too?)
3. **Preferred hosting?** (Vercel? Railway? Same as FlightLog?)
4. **FlightLog integration priority?** (MVP or v2?)

---

## Appendix

### Competitors to Track (from Master Context)
- CarePredict
- PalCare  
- Securitas (Arial)
- RFT
- VirtuSense
- EchoCare
- SmartPeep
- Vayyar
- Lindera
- Paul

### Threat Scoring Rules (from Master Context G3)

**HIGH (Score 3):**
- Mentions "SafelyYou" by name
- Bathroom monitoring claims
- Voice-activated eCall
- Mobile app launches
- Major REIT partnerships (Welltower, Ventas, Sabra, NHI)
- Wins at current SY customers
- Large portfolio deployments (50+ communities)

**MEDIUM (Score 2):**
- Product announcements in adjacent areas
- Customer case studies with specific ROI
- EHR/tech vendor partnerships
- Funding rounds
- Conference presence at NIC, LeadingAge, Argentum

**LOW (Score 1):**
- Thought leadership content
- Hiring announcements
- International market focus
- SNF-only focus
