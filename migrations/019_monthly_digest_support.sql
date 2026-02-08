-- Migration 019: Add monthly digest support
--
-- Adds digest_type column to digest_config and weekly_digests tables
-- so we can have separate weekly and monthly configs + digests.
-- Additive only — safe for shared FlightLog database.
-- Safe to run multiple times (IF NOT EXISTS patterns).
-- Run in Supabase SQL Editor.
-- Created: 2026-02-08

-- ============================================
-- 1. Add digest_type to digest_config
-- ============================================
ALTER TABLE digest_config ADD COLUMN IF NOT EXISTS digest_type TEXT NOT NULL DEFAULT 'weekly';

-- ============================================
-- 2. Add delivery_day_of_month to digest_config (for monthly schedule)
-- ============================================
ALTER TABLE digest_config ADD COLUMN IF NOT EXISTS delivery_day_of_month INTEGER DEFAULT 1;

-- ============================================
-- 3. Add digest_type to weekly_digests
-- ============================================
ALTER TABLE weekly_digests ADD COLUMN IF NOT EXISTS digest_type TEXT NOT NULL DEFAULT 'weekly';

-- ============================================
-- 4. Unique index: one active config per type
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_digest_config_active_type
  ON digest_config (digest_type) WHERE is_active = true;

-- ============================================
-- 5. Seed monthly digest config (only if none exists)
-- ============================================
INSERT INTO digest_config (
  system_prompt, focus_areas, output_format,
  delivery_day_of_month, delivery_hour, model, is_active, digest_type
)
SELECT
  'Analyze the past 30 days of competitor intelligence data to identify strategic trends, market shifts, and longer-term patterns.

Compare to the previous month''s report for month-over-month trend analysis.

Review the SafelyYou Master Context for company positioning and priorities.

Focus the analysis on:
- Multi-week strategic patterns and emerging market trends
- Competitive positioning shifts over the month
- Cumulative hiring signals and organizational changes
- Market consolidation or expansion patterns
- Long-term threats and opportunities for SafelyYou
- Notable changes from the previous month

Format the output as:
- Executive Summary (300 words max)
- Monthly Trend Analysis [What changed and what it means]
- Strategic Competitive Landscape [Position shifts and implications]
- 90-Day Outlook [What to watch for next]
- Recommended Strategic Actions [2-3 specific next steps]
- Provide links to the most significant posts mentioned.

Output format: Markdown .md
Title: ''mm/yyyy - Monthly Strategic Intelligence Report''

Final goal: Deliver a monthly strategic intelligence report that helps SafelyYou leadership understand macro competitive dynamics and plan accordingly.',
  ARRAY['market trends', 'strategic positioning', 'hiring patterns', 'M&A activity', 'product launches'],
  'detailed',
  1,
  18,
  'google/gemini-2.0-flash-001',
  true,
  'monthly'
WHERE NOT EXISTS (SELECT 1 FROM digest_config WHERE digest_type = 'monthly');
