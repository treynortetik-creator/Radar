-- Migration 010: Competitor Profiles
-- Adds executive roster, product details, and battle cards to competitor profiles
-- Created: 2026-02-07

-- Competitor executives
DO $$ BEGIN
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
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- Competitor products
DO $$ BEGIN
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
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- Battle cards
DO $$ BEGIN
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
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- Extend existing competitors table
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS employee_count TEXT;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS funding TEXT;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS market_segments TEXT[];
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_competitor_executives_competitor_id ON competitor_executives(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_products_competitor_id ON competitor_products(competitor_id);
CREATE INDEX IF NOT EXISTS idx_battle_cards_competitor_id ON battle_cards(competitor_id);

-- RLS policies (anonymous read, service write)
ALTER TABLE competitor_executives ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_cards ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow anonymous read on competitor_executives" ON competitor_executives FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow service write on competitor_executives" ON competitor_executives FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow anonymous read on competitor_products" ON competitor_products FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow service write on competitor_products" ON competitor_products FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow anonymous read on battle_cards" ON battle_cards FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow service write on battle_cards" ON battle_cards FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
