-- ============================================
-- RADAR COMPETITIVE INTELLIGENCE - Supabase Schema
-- ============================================
-- This is the canonical schema for the Radar app.
-- Run in Supabase SQL Editor for fresh installs.
-- For existing installs, use migrations/ folder.

-- ============================================
-- REFERENCE TABLES
-- ============================================

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
    is_job_board BOOLEAN DEFAULT FALSE,
    last_fetched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MAIN EVENTS TABLE
-- ============================================

CREATE TABLE competitor_events (
    id SERIAL PRIMARY KEY,

    -- Relationships
    feed_id INTEGER REFERENCES feeds(id),
    competitor_id INTEGER REFERENCES competitors(id),

    -- Core fields (from RSS)
    url_hash TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    summary TEXT,
    published_at TIMESTAMPTZ,
    feed_name TEXT,                       -- Denormalized for convenience
    is_job_board BOOLEAN DEFAULT FALSE,

    -- AI-scored fields (matching Zapier rubric)
    theme TEXT,                           -- Product/Feature, Customer Win, Partnership/Integration,
                                          -- Funding/Corporate, Competitive Attack, Pricing/Packaging,
                                          -- Event/Conference, Thought Leadership, Job Posting
    category TEXT,                        -- Alternate categorization: product, funding, partnership, hiring, news, customer_win

    threat_level INTEGER CHECK(threat_level BETWEEN 1 AND 3),
                                          -- 1=Low, 2=Medium, 3=High
    threat_reasons TEXT[],                -- Array of reasons for threat level

    strategic_relevance INTEGER CHECK(strategic_relevance BETWEEN 1 AND 3),
                                          -- 1=Low, 2=Medium, 3=High
    content_type_weight INTEGER CHECK(content_type_weight BETWEEN 1 AND 3),
                                          -- 1=Awareness, 2=Credibility, 3=Market Action

    priority_score REAL,                  -- Average of threat+relevance+weight / 3
    priority_tier TEXT CHECK(priority_tier IN ('Low','Medium','High','Critical')),
                                          -- Derived from priority_score + auto-flag override

    route_to TEXT CHECK(route_to IN ('Marketing','Product','Sales Enablement','Leadership','Monitor Only')),
    key_takeaway TEXT,                    -- 1-2 sentence competitive insight
    auto_flag_triggers TEXT,              -- Comma-separated trigger matches (or empty)

    -- User interaction
    is_read BOOLEAN DEFAULT FALSE,
    is_actioned BOOLEAN DEFAULT FALSE,
    notes TEXT,

    -- Sync status
    synced_to_sheet BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_events_competitor ON competitor_events(competitor_id);
CREATE INDEX idx_events_feed ON competitor_events(feed_id);
CREATE INDEX idx_events_threat ON competitor_events(threat_level DESC);
CREATE INDEX idx_events_priority_tier ON competitor_events(priority_tier);
CREATE INDEX idx_events_published ON competitor_events(published_at DESC);
CREATE INDEX idx_events_category ON competitor_events(category);
CREATE INDEX idx_events_theme ON competitor_events(theme);
CREATE INDEX idx_events_unread ON competitor_events(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_events_unsynced ON competitor_events(synced_to_sheet) WHERE synced_to_sheet = FALSE;

CREATE INDEX idx_feeds_competitor ON feeds(competitor_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE competitor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeds ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (for the dashboard)
CREATE POLICY "Allow anonymous read" ON competitor_events FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read" ON competitors FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read" ON feeds FOR SELECT USING (true);

-- Write access: service_role key (used by API routes) bypasses RLS.
-- No explicit write policy needed — only service_role should write.

-- ============================================
-- USEFUL VIEWS
-- ============================================

CREATE VIEW high_priority_events AS
SELECT
    e.*,
    c.name as competitor_name,
    c.slug as competitor_slug
FROM competitor_events e
JOIN competitors c ON e.competitor_id = c.id
WHERE e.priority_tier IN ('High', 'Critical')
ORDER BY e.published_at DESC;

CREATE VIEW unsynced_events AS
SELECT
    e.*,
    c.name as competitor_name
FROM competitor_events e
JOIN competitors c ON e.competitor_id = c.id
WHERE e.synced_to_sheet = FALSE
ORDER BY e.published_at DESC;

CREATE VIEW unread_events AS
SELECT
    e.*,
    c.name as competitor_name,
    c.slug as competitor_slug
FROM competitor_events e
JOIN competitors c ON e.competitor_id = c.id
WHERE e.is_read = FALSE
ORDER BY e.priority_tier DESC, e.published_at DESC;

-- ============================================
-- WEEKLY INTEL DIGEST
-- ============================================

CREATE TABLE weekly_digests (
    id SERIAL PRIMARY KEY,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    event_count INTEGER,
    competitor_breakdown JSONB,
    model_used TEXT,
    prompt_version INTEGER,
    tokens_used INTEGER,
    cost_estimate DECIMAL(8,4),
    status TEXT DEFAULT 'generated',
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE digest_config (
    id SERIAL PRIMARY KEY,
    system_prompt TEXT NOT NULL,
    focus_areas TEXT[],
    output_format TEXT DEFAULT 'detailed',
    delivery_day INTEGER DEFAULT 0,
    delivery_hour INTEGER DEFAULT 18,
    model TEXT DEFAULT 'google/gemini-2.0-flash-001',
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_digests_week ON weekly_digests(week_end DESC);
CREATE INDEX idx_digests_status ON weekly_digests(status);

ALTER TABLE weekly_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read" ON weekly_digests FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read" ON digest_config FOR SELECT USING (true);
CREATE POLICY "Allow service write" ON weekly_digests FOR ALL USING (true);
CREATE POLICY "Allow service write" ON digest_config FOR ALL USING (true);
