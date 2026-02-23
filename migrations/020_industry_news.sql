-- ============================================
-- INDUSTRY NEWS PIPELINE (Pipeline B)
-- ============================================

CREATE TABLE IF NOT EXISTS industry_news (
  id SERIAL PRIMARY KEY,

  -- Core fields (from RSS)
  url_hash TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  summary TEXT,
  published_at TIMESTAMPTZ,
  source_name TEXT NOT NULL,
  feed_url TEXT,

  -- AI-scored fields
  relevance_tier TEXT CHECK(relevance_tier IN ('Major', 'Notable', 'Background')),
  relevance_summary TEXT,
  topics TEXT[],
  mentioned_accounts TEXT[],

  -- User interaction
  is_read BOOLEAN DEFAULT FALSE,
  is_actioned BOOLEAN DEFAULT FALSE,
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_industry_tier ON industry_news(relevance_tier);
CREATE INDEX IF NOT EXISTS idx_industry_published ON industry_news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_industry_source ON industry_news(source_name);
CREATE INDEX IF NOT EXISTS idx_industry_unread ON industry_news(is_read) WHERE is_read = FALSE;

ALTER TABLE industry_news ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow anonymous read"
    ON industry_news FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow service write"
    ON industry_news FOR ALL
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
