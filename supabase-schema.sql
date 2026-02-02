-- Supabase Schema for Radar Competitive Intelligence
-- Run this in Supabase SQL Editor to create the table

CREATE TABLE competitor_events (
    id BIGSERIAL PRIMARY KEY,
    url_hash TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    summary TEXT,
    published_at DATE,
    competitor TEXT NOT NULL,
    feed_name TEXT,
    is_job_board BOOLEAN DEFAULT FALSE,
    theme TEXT,
    threat_level INTEGER CHECK(threat_level BETWEEN 1 AND 3),
    strategic_relevance INTEGER CHECK(strategic_relevance BETWEEN 1 AND 3),
    content_type_weight INTEGER CHECK(content_type_weight BETWEEN 1 AND 3),
    priority_score REAL,
    priority_tier TEXT CHECK(priority_tier IN ('Low','Medium','High','Critical')),
    route_to TEXT CHECK(route_to IN ('Marketing','Product','Sales Enablement','Leadership','Monitor Only')),
    key_takeaway TEXT,
    auto_flag_triggers TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    synced_to_sheet BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX idx_competitor ON competitor_events(competitor);
CREATE INDEX idx_priority_tier ON competitor_events(priority_tier);
CREATE INDEX idx_published ON competitor_events(published_at DESC);
CREATE INDEX idx_threat ON competitor_events(threat_level DESC);

-- RLS (Row Level Security) - enable for public read access
ALTER TABLE competitor_events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (for the dashboard)
CREATE POLICY "Allow anonymous read" ON competitor_events
    FOR SELECT USING (true);

-- Allow authenticated insert/update (for the ingestion pipeline)
CREATE POLICY "Allow authenticated write" ON competitor_events
    FOR ALL USING (auth.role() = 'authenticated');
