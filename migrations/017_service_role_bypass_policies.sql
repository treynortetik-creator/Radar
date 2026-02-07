-- Migration 017: Add explicit service_role bypass policies to all tables
--
-- Context: service_role already bypasses RLS implicitly in Supabase,
-- but adding explicit policies documents the intent and ensures
-- defense-in-depth if Supabase behavior ever changes.
--
-- All 9 tables already have RLS ENABLED:
--   competitors, feeds, competitor_events, weekly_digests,
--   digest_config, competitor_executives, competitor_products,
--   battle_cards, admin_config
--
-- This migration adds a "Service role bypass" FOR ALL policy on each.
-- Created: 2026-02-07

-- ============================================
-- 1. competitors
-- ============================================
DO $$ BEGIN
  CREATE POLICY "Service role bypass on competitors"
    ON competitors FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. feeds
-- ============================================
DO $$ BEGIN
  CREATE POLICY "Service role bypass on feeds"
    ON feeds FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 3. competitor_events
-- ============================================
DO $$ BEGIN
  CREATE POLICY "Service role bypass on competitor_events"
    ON competitor_events FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 4. weekly_digests
-- ============================================
DO $$ BEGIN
  CREATE POLICY "Service role bypass on weekly_digests"
    ON weekly_digests FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 5. digest_config
-- ============================================
DO $$ BEGIN
  CREATE POLICY "Service role bypass on digest_config"
    ON digest_config FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 6. competitor_executives
-- ============================================
DO $$ BEGIN
  CREATE POLICY "Service role bypass on competitor_executives"
    ON competitor_executives FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 7. competitor_products
-- ============================================
DO $$ BEGIN
  CREATE POLICY "Service role bypass on competitor_products"
    ON competitor_products FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 8. battle_cards
-- ============================================
DO $$ BEGIN
  CREATE POLICY "Service role bypass on battle_cards"
    ON battle_cards FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 9. admin_config
-- ============================================
DO $$ BEGIN
  CREATE POLICY "Service role bypass on admin_config"
    ON admin_config FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
