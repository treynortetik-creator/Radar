-- ============================================================
-- 003: Weekly Digests Table + Slack Columns
-- ============================================================
-- Creates the weekly_digests table if it doesn't exist,
-- then adds Slack-specific columns used by the digest/run pipeline.
-- Safe to run multiple times (idempotent).
-- ============================================================

-- Create table if it doesn't exist (minimal schema)
CREATE TABLE IF NOT EXISTS weekly_digests (
  id SERIAL PRIMARY KEY,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  event_count INTEGER,
  high_count INTEGER,
  summary_text TEXT,
  slack_posted BOOLEAN DEFAULT FALSE,
  slack_ts TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add extended columns if they don't exist (for fresh Radar installs using 005_weekly_digest.sql)
-- These columns are used by the full digest generation pipeline
ALTER TABLE weekly_digests ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE weekly_digests ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE weekly_digests ADD COLUMN IF NOT EXISTS competitor_breakdown JSONB;
ALTER TABLE weekly_digests ADD COLUMN IF NOT EXISTS model_used TEXT;
ALTER TABLE weekly_digests ADD COLUMN IF NOT EXISTS prompt_version INTEGER;
ALTER TABLE weekly_digests ADD COLUMN IF NOT EXISTS tokens_used INTEGER;
ALTER TABLE weekly_digests ADD COLUMN IF NOT EXISTS cost_estimate DECIMAL(8,4);
ALTER TABLE weekly_digests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'generated';
ALTER TABLE weekly_digests ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Add Slack columns to existing installs that ran 005_weekly_digest.sql first
ALTER TABLE weekly_digests ADD COLUMN IF NOT EXISTS high_count INTEGER;
ALTER TABLE weekly_digests ADD COLUMN IF NOT EXISTS summary_text TEXT;
ALTER TABLE weekly_digests ADD COLUMN IF NOT EXISTS slack_posted BOOLEAN DEFAULT FALSE;
ALTER TABLE weekly_digests ADD COLUMN IF NOT EXISTS slack_ts TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_digests_week ON weekly_digests(week_end DESC);
CREATE INDEX IF NOT EXISTS idx_digests_status ON weekly_digests(status);
CREATE INDEX IF NOT EXISTS idx_digests_slack ON weekly_digests(slack_posted);

-- RLS
ALTER TABLE weekly_digests ENABLE ROW LEVEL SECURITY;

-- Policies (CREATE OR REPLACE not available for policies, so use DROP IF EXISTS)
DROP POLICY IF EXISTS "Allow anonymous read weekly_digests" ON weekly_digests;
CREATE POLICY "Allow anonymous read weekly_digests" ON weekly_digests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow service write weekly_digests" ON weekly_digests;
CREATE POLICY "Allow service write weekly_digests" ON weekly_digests FOR ALL USING (true);
