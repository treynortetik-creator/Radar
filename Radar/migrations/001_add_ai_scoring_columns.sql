-- Migration: Add AI scoring columns to competitor_events
-- Run this in Supabase SQL Editor to add missing columns
-- Safe to run multiple times (uses IF NOT EXISTS pattern via DO block)

-- Add missing columns to competitor_events
DO $$
BEGIN
    -- Theme (replaces/supplements category)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'competitor_events' AND column_name = 'theme') THEN
        ALTER TABLE competitor_events ADD COLUMN theme TEXT;
    END IF;

    -- Strategic relevance (1-3 scale)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'competitor_events' AND column_name = 'strategic_relevance') THEN
        ALTER TABLE competitor_events ADD COLUMN strategic_relevance INTEGER CHECK(strategic_relevance BETWEEN 1 AND 3);
    END IF;

    -- Content type weight (1-3 scale)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'competitor_events' AND column_name = 'content_type_weight') THEN
        ALTER TABLE competitor_events ADD COLUMN content_type_weight INTEGER CHECK(content_type_weight BETWEEN 1 AND 3);
    END IF;

    -- Priority score (calculated average)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'competitor_events' AND column_name = 'priority_score') THEN
        ALTER TABLE competitor_events ADD COLUMN priority_score REAL;
    END IF;

    -- Priority tier (derived from score)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'competitor_events' AND column_name = 'priority_tier') THEN
        ALTER TABLE competitor_events ADD COLUMN priority_tier TEXT CHECK(priority_tier IN ('Low','Medium','High','Critical'));
    END IF;

    -- Route to (team routing)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'competitor_events' AND column_name = 'route_to') THEN
        ALTER TABLE competitor_events ADD COLUMN route_to TEXT CHECK(route_to IN ('Marketing','Product','Sales Enablement','Leadership','Monitor Only'));
    END IF;

    -- Key takeaway (AI-generated insight)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'competitor_events' AND column_name = 'key_takeaway') THEN
        ALTER TABLE competitor_events ADD COLUMN key_takeaway TEXT;
    END IF;

    -- Auto-flag triggers
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'competitor_events' AND column_name = 'auto_flag_triggers') THEN
        ALTER TABLE competitor_events ADD COLUMN auto_flag_triggers TEXT;
    END IF;

    -- Feed name (denormalized for convenience)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'competitor_events' AND column_name = 'feed_name') THEN
        ALTER TABLE competitor_events ADD COLUMN feed_name TEXT;
    END IF;

    -- Is job board flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'competitor_events' AND column_name = 'is_job_board') THEN
        ALTER TABLE competitor_events ADD COLUMN is_job_board BOOLEAN DEFAULT FALSE;
    END IF;

    -- Synced to sheet flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'competitor_events' AND column_name = 'synced_to_sheet') THEN
        ALTER TABLE competitor_events ADD COLUMN synced_to_sheet BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Convert threat_level from TEXT to INTEGER (if it's currently TEXT)
-- First, add a new column, migrate data, drop old, rename new
DO $$
BEGIN
    -- Check if threat_level is TEXT type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'competitor_events'
        AND column_name = 'threat_level'
        AND data_type = 'text'
    ) THEN
        -- Add new integer column
        ALTER TABLE competitor_events ADD COLUMN threat_level_int INTEGER CHECK(threat_level_int BETWEEN 1 AND 3);

        -- Migrate data
        UPDATE competitor_events SET threat_level_int = CASE
            WHEN threat_level = 'high' THEN 3
            WHEN threat_level = 'medium' THEN 2
            WHEN threat_level = 'low' THEN 1
            ELSE NULL
        END;

        -- Drop old column and rename new
        ALTER TABLE competitor_events DROP COLUMN threat_level;
        ALTER TABLE competitor_events RENAME COLUMN threat_level_int TO threat_level;
    END IF;
END $$;

-- Add RLS policies if not exists
ALTER TABLE competitor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeds ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist, then recreate (safe way)
DROP POLICY IF EXISTS "Allow anonymous read" ON competitor_events;
DROP POLICY IF EXISTS "Allow authenticated write" ON competitor_events;
DROP POLICY IF EXISTS "Allow anonymous read" ON competitors;
DROP POLICY IF EXISTS "Allow anonymous read" ON feeds;

CREATE POLICY "Allow anonymous read" ON competitor_events FOR SELECT USING (true);
CREATE POLICY "Allow authenticated write" ON competitor_events FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow anonymous read" ON competitors FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read" ON feeds FOR SELECT USING (true);

-- Create useful indexes if not exist
CREATE INDEX IF NOT EXISTS idx_events_priority_tier ON competitor_events(priority_tier);
CREATE INDEX IF NOT EXISTS idx_events_synced ON competitor_events(synced_to_sheet) WHERE synced_to_sheet = FALSE;
