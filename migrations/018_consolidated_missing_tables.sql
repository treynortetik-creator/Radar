-- Migration 018: Consolidated — Create all missing tables and apply all pending RLS
--
-- Safe to run multiple times (uses IF NOT EXISTS / DO $$ EXCEPTION patterns)
-- Does NOT touch FlightLog tables
-- Run this in Supabase SQL Editor
-- Created: 2026-02-08

-- ============================================
-- 1. weekly_digests (from migration 005)
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_digests (
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

CREATE INDEX IF NOT EXISTS idx_digests_week ON weekly_digests(week_end DESC);
CREATE INDEX IF NOT EXISTS idx_digests_status ON weekly_digests(status);

-- ============================================
-- 2. digest_config (from migration 005)
-- ============================================
CREATE TABLE IF NOT EXISTS digest_config (
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

-- ============================================
-- 3. competitor_executives (from migration 010)
-- ============================================
CREATE TABLE IF NOT EXISTS competitor_executives (
  id SERIAL PRIMARY KEY,
  competitor_id INTEGER REFERENCES competitors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  linkedin_url TEXT,
  background TEXT,
  started_role TEXT,
  is_current BOOLEAN DEFAULT TRUE,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitor_executives_competitor_id ON competitor_executives(competitor_id);

-- ============================================
-- 4. competitor_products (from migration 010)
-- ============================================
CREATE TABLE IF NOT EXISTS competitor_products (
  id SERIAL PRIMARY KEY,
  competitor_id INTEGER REFERENCES competitors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  features JSONB,
  pricing TEXT,
  technology TEXT,
  limitations TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitor_products_competitor_id ON competitor_products(competitor_id);

-- ============================================
-- 5. battle_cards (from migration 010)
-- ============================================
CREATE TABLE IF NOT EXISTS battle_cards (
  id SERIAL PRIMARY KEY,
  competitor_id INTEGER REFERENCES competitors(id) ON DELETE CASCADE,
  when_they_come_up TEXT,
  their_pitch TEXT,
  our_counter TEXT,
  landmines TEXT,
  proof_points TEXT[],
  objection_handling JSONB,
  last_reviewed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_battle_cards_competitor_id ON battle_cards(competitor_id);

-- ============================================
-- 6. Extend competitors table (from migration 010)
-- ============================================
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS employee_count TEXT;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS funding TEXT;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS market_segments TEXT[];
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- 7. Enable RLS on all tables
-- ============================================
ALTER TABLE weekly_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_executives ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. Drop stale permissive policies (migrations 015 + 016)
-- ============================================
DROP POLICY IF EXISTS "Allow anonymous read" ON weekly_digests;
DROP POLICY IF EXISTS "Allow anonymous read" ON digest_config;
DROP POLICY IF EXISTS "Allow anonymous read" ON competitor_events;
DROP POLICY IF EXISTS "Allow anonymous read" ON competitors;
DROP POLICY IF EXISTS "Allow anonymous read" ON feeds;
DROP POLICY IF EXISTS "Allow anonymous read on competitor_executives" ON competitor_executives;
DROP POLICY IF EXISTS "Allow anonymous read on competitor_products" ON competitor_products;
DROP POLICY IF EXISTS "Allow anonymous read on battle_cards" ON battle_cards;

DROP POLICY IF EXISTS "Allow service write" ON weekly_digests;
DROP POLICY IF EXISTS "Allow service write" ON digest_config;
DROP POLICY IF EXISTS "Allow service write on competitor_executives" ON competitor_executives;
DROP POLICY IF EXISTS "Allow service write on competitor_products" ON competitor_products;
DROP POLICY IF EXISTS "Allow service write on battle_cards" ON battle_cards;

DROP POLICY IF EXISTS "Allow authenticated write" ON competitor_events;
DROP POLICY IF EXISTS "Allow authenticated write" ON competitors;
DROP POLICY IF EXISTS "Allow authenticated write" ON feeds;

-- ============================================
-- 9. Create proper RLS policies — authenticated read only (migration 015)
-- ============================================
DO $$ BEGIN
  CREATE POLICY "Authenticated read on weekly_digests"
    ON weekly_digests FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated read on digest_config"
    ON digest_config FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated read on competitor_events"
    ON competitor_events FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated read on competitors"
    ON competitors FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated read on feeds"
    ON feeds FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated read on competitor_executives"
    ON competitor_executives FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated read on competitor_products"
    ON competitor_products FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated read on battle_cards"
    ON battle_cards FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated read on admin_config"
    ON admin_config FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 10. Service role bypass policies (migration 017)
-- ============================================
DO $$ BEGIN
  CREATE POLICY "Service role bypass on competitors"
    ON competitors FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role bypass on feeds"
    ON feeds FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role bypass on competitor_events"
    ON competitor_events FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role bypass on weekly_digests"
    ON weekly_digests FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role bypass on digest_config"
    ON digest_config FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role bypass on competitor_executives"
    ON competitor_executives FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role bypass on competitor_products"
    ON competitor_products FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role bypass on battle_cards"
    ON battle_cards FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role bypass on admin_config"
    ON admin_config FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 11. Seed default digest config (only if table is empty)
-- ============================================
INSERT INTO digest_config (system_prompt, focus_areas, output_format, delivery_day, delivery_hour, model)
SELECT
  'ONLY analyze entries from the last 7 days. Explicitly exclude any entries with dates outside this window.

Retrieve last week''s report to compare to this week''s data and look for trends or patterns week over week.

Review SafelyYou_Master_Context file.

Analyze competitor data to identify key data points, trends, and significant findings, and write a summary (300 words or less).

Compile a comprehensive marketing analysis from SafelyYou''s perspective as an AI-powered fall detection company serving senior living facilities.

Focus the analysis on:
- Competitive moves or industry trends relevant to SafelyYou''s positioning in senior living tech
- Gaps or opportunities SafelyYou could exploit
- Messaging or value propositions that would resonate based on current data
- Specific pain points or facility types that align with SafelyYou''s target market
- Key insights the sales or marketing team should be aware of

Format the output as:
- 7-Day Summary [Key data points and trends]
- SafelyYou Marketing Analysis [Competitive insights and opportunities]
- Recommended Actions [2-3 specific next steps for our team]
- Provide links to posts mentioned.

Output format: Markdown .md
Title: ''mm/dd/yyyy - Weekly Marketing Intelligence Report''

Final goal: Deliver a weekly competitor marketing intelligence report that helps SafelyYou stay ahead of industry trends and identify strategic opportunities in the senior living technology market.',
  ARRAY['bathroom safety', 'fall detection', 'senior living tech', 'REIT deals'],
  'detailed',
  0,
  18,
  'google/gemini-2.0-flash-001'
WHERE NOT EXISTS (SELECT 1 FROM digest_config LIMIT 1);
