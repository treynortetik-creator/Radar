-- Migration 016: Drop stale authenticated write policies
-- SECURITY FIX: Remove "Allow authenticated write" policies on core tables.
--
-- Problem: competitor_events, competitors, and feeds still have
-- "Allow authenticated write" FOR ALL policies from the original schema.
-- Migration 015 tightened read policies but never dropped these write
-- policies. Any authenticated user can INSERT/UPDATE/DELETE rows.
--
-- Fix: Drop these policies. The ingest API uses the service_role key,
-- which bypasses RLS entirely, so no explicit write policy is needed.
-- Created: 2026-02-07

-- ============================================
-- 1. competitor_events — drop stale write policy
-- ============================================
DROP POLICY IF EXISTS "Allow authenticated write" ON competitor_events;

-- ============================================
-- 2. competitors — drop stale write policy
-- ============================================
DROP POLICY IF EXISTS "Allow authenticated write" ON competitors;

-- ============================================
-- 3. feeds — drop stale write policy
-- ============================================
DROP POLICY IF EXISTS "Allow authenticated write" ON feeds;
