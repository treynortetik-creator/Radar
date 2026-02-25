-- CompetitorRadar Database Schema
-- SQLite (Phase 1) — will migrate to Supabase in Phase 2
-- 
-- This schema matches both the PRD requirements and the Zapier instruction
-- scoring fields (Strategic Relevance, Content Type Weight, Priority Score,
-- Priority Tier, Route To, Auto-Flag Triggers).

CREATE TABLE IF NOT EXISTS competitor_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Core fields (from RSS)
    url_hash TEXT UNIQUE NOT NULL,        -- SHA256[:16] of URL, for deduplication
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    summary TEXT,
    published_at TEXT,                    -- YYYY-MM-DD format
    competitor TEXT NOT NULL,             -- CarePredict, VirtuSense, Sage, Nobi, Inspiren, Amba
    feed_name TEXT,                       -- Source feed identifier
    is_job_board BOOLEAN DEFAULT 0,      -- True for job posting feeds
    
    -- AI-scored fields (matching Zapier rubric)
    theme TEXT,                           -- Product/Feature, Customer Win, Partnership/Integration,
                                         -- Funding/Corporate, Competitive Attack, Pricing/Packaging,
                                         -- Event/Conference, Thought Leadership, Job Posting
    threat_level INTEGER CHECK(threat_level BETWEEN 1 AND 3),
                                         -- 1=Low, 2=Medium, 3=High
    strategic_relevance INTEGER CHECK(strategic_relevance BETWEEN 1 AND 3),
                                         -- 1=Low, 2=Medium, 3=High
    content_type_weight INTEGER CHECK(content_type_weight BETWEEN 1 AND 3),
                                         -- 1=Awareness, 2=Credibility, 3=Market Action
    priority_score REAL,                 -- Average of threat+relevance+weight / 3
    priority_tier TEXT CHECK(priority_tier IN ('Low','Medium','High','Critical')),
                                         -- Derived from priority_score + auto-flag override
    route_to TEXT CHECK(route_to IN ('Marketing','Product','Sales Enablement','Leadership','Monitor Only')),
    key_takeaway TEXT,                   -- 1-2 sentence competitive insight
    auto_flag_triggers TEXT,             -- Comma-separated trigger matches (or empty)
    
    -- Metadata
    created_at TEXT DEFAULT (datetime('now')),
    synced_to_sheet BOOLEAN DEFAULT 0    -- Whether row has been written to Google Sheet
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_url_hash ON competitor_events(url_hash);
CREATE INDEX IF NOT EXISTS idx_competitor ON competitor_events(competitor);
CREATE INDEX IF NOT EXISTS idx_priority_tier ON competitor_events(priority_tier);
CREATE INDEX IF NOT EXISTS idx_published ON competitor_events(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_threat ON competitor_events(threat_level DESC);
CREATE INDEX IF NOT EXISTS idx_synced ON competitor_events(synced_to_sheet);

-- Useful views
CREATE VIEW IF NOT EXISTS high_priority_events AS
SELECT * FROM competitor_events 
WHERE priority_tier IN ('High', 'Critical')
ORDER BY published_at DESC;

CREATE VIEW IF NOT EXISTS unsynced_events AS
SELECT * FROM competitor_events
WHERE synced_to_sheet = 0
ORDER BY published_at DESC;
