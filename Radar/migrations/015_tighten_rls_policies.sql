-- Migration 015: Tighten RLS Policies
-- SECURITY FIX: Restrict write policies to service_role only (not anonymous/public)
--
-- Problem: Several tables had "Allow service write" with USING (true),
-- which allows ANY role (including anonymous) to write. The service_role
-- bypasses RLS entirely, so these policies only served to open writes
-- to anonymous/authenticated users.
--
-- Fix: Change write policies to require authenticated role at minimum.
-- The service_role key (used by API routes) bypasses RLS anyway.
-- Created: 2026-02-07

-- ============================================
-- 1. admin_config — was MISSING RLS entirely
-- ============================================
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

-- Read: authenticated users only (contains system prompts, model config)
DO $$ BEGIN
  CREATE POLICY "Authenticated read on admin_config"
    ON admin_config FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Write: only service_role bypasses RLS; no explicit write policy needed
-- (service_role bypasses RLS, authenticated users should not modify config directly)

-- ============================================
-- 2. weekly_digests — fix overly permissive write
-- ============================================
DROP POLICY IF EXISTS "Allow service write" ON weekly_digests;

-- Only authenticated users can read digests (sensitive competitive intel)
DROP POLICY IF EXISTS "Allow anonymous read" ON weekly_digests;
DO $$ BEGIN
  CREATE POLICY "Authenticated read on weekly_digests"
    ON weekly_digests FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- No explicit write policy — service_role (used by API) bypasses RLS

-- ============================================
-- 3. digest_config — fix overly permissive write
-- ============================================
DROP POLICY IF EXISTS "Allow service write" ON digest_config;

DROP POLICY IF EXISTS "Allow anonymous read" ON digest_config;
DO $$ BEGIN
  CREATE POLICY "Authenticated read on digest_config"
    ON digest_config FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 4. competitor_executives — fix overly permissive write
-- ============================================
DROP POLICY IF EXISTS "Allow service write on competitor_executives" ON competitor_executives;

-- Keep read as authenticated (contains LinkedIn URLs, backgrounds)
DROP POLICY IF EXISTS "Allow anonymous read on competitor_executives" ON competitor_executives;
DO $$ BEGIN
  CREATE POLICY "Authenticated read on competitor_executives"
    ON competitor_executives FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 5. competitor_products — fix overly permissive write
-- ============================================
DROP POLICY IF EXISTS "Allow service write on competitor_products" ON competitor_products;

DROP POLICY IF EXISTS "Allow anonymous read on competitor_products" ON competitor_products;
DO $$ BEGIN
  CREATE POLICY "Authenticated read on competitor_products"
    ON competitor_products FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 6. battle_cards — fix overly permissive write
-- ============================================
DROP POLICY IF EXISTS "Allow service write on battle_cards" ON battle_cards;

DROP POLICY IF EXISTS "Allow anonymous read on battle_cards" ON battle_cards;
DO $$ BEGIN
  CREATE POLICY "Authenticated read on battle_cards"
    ON battle_cards FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 7. competitor_events — tighten read to authenticated
-- ============================================
DROP POLICY IF EXISTS "Allow anonymous read" ON competitor_events;
DO $$ BEGIN
  CREATE POLICY "Authenticated read on competitor_events"
    ON competitor_events FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 8. competitors — tighten read to authenticated
-- ============================================
DROP POLICY IF EXISTS "Allow anonymous read" ON competitors;
DO $$ BEGIN
  CREATE POLICY "Authenticated read on competitors"
    ON competitors FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 9. feeds — tighten read to authenticated
-- ============================================
DROP POLICY IF EXISTS "Allow anonymous read" ON feeds;
DO $$ BEGIN
  CREATE POLICY "Authenticated read on feeds"
    ON feeds FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
