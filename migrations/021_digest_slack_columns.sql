-- ============================================
-- WEEKLY DIGEST: INDUSTRY + SLACK DELIVERY METADATA
-- ============================================

ALTER TABLE weekly_digests
  ADD COLUMN IF NOT EXISTS industry_news_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS industry_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS slack_posted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS slack_ts TEXT,
  ADD COLUMN IF NOT EXISTS slack_error TEXT;
