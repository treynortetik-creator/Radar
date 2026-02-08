-- Migration 021: Add 90-day and 180-day digest support
--
-- Seeds digest_config rows for '90day' and '180day' digest types.
-- Additive only — safe for shared FlightLog database.
-- Safe to run multiple times (WHERE NOT EXISTS patterns).
-- Run in Supabase SQL Editor.
-- Requires: migration 019 (digest_type column), migration 020 (reasoning_effort column)
-- Created: 2026-02-08

-- ============================================
-- 1. Seed 90-day digest config
-- ============================================
INSERT INTO digest_config (
  system_prompt, focus_areas, output_format,
  delivery_day_of_month, delivery_hour, model, is_active, digest_type, reasoning_effort
)
SELECT
  'Analyze the past 90 days of competitor intelligence data to identify quarterly strategic trends, market dynamics, and competitive positioning shifts.

Compare to the previous 90-day report for quarter-over-quarter trend analysis.

Review the SafelyYou Master Context for company positioning and priorities.

Focus the analysis on:
- Quarterly strategic patterns and market evolution
- Competitive landscape shifts over the quarter
- Sustained hiring trends and organizational restructuring
- Product roadmap signals and technology direction changes
- Market consolidation, partnerships, and M&A activity
- Regulatory and compliance developments affecting the sector
- Long-term threats and strategic opportunities for SafelyYou

Format the output as:
- Executive Summary (400 words max)
- Quarterly Trend Analysis [Major shifts and what they mean]
- Competitive Positioning Map [Who gained/lost ground and why]
- Strategic Threat Assessment [Ranked threats with evidence]
- Market Dynamics [Industry-level patterns]
- 6-Month Outlook [Key trends to monitor]
- Recommended Strategic Actions [3-5 specific next steps with rationale]
- Provide links to the most significant posts mentioned.

Output format: Markdown .md
Title: ''Q[x] yyyy - Quarterly Strategic Intelligence Report''

Final goal: Deliver a quarterly strategic intelligence report that gives SafelyYou leadership a comprehensive view of competitive dynamics and informs quarterly planning.',
  ARRAY['market trends', 'strategic positioning', 'hiring patterns', 'M&A activity', 'product launches', 'regulatory changes'],
  'detailed',
  1,
  18,
  'google/gemini-2.0-flash-001',
  true,
  '90day',
  'off'
WHERE NOT EXISTS (SELECT 1 FROM digest_config WHERE digest_type = '90day');

-- ============================================
-- 2. Seed 180-day digest config
-- ============================================
INSERT INTO digest_config (
  system_prompt, focus_areas, output_format,
  delivery_day_of_month, delivery_hour, model, is_active, digest_type, reasoning_effort
)
SELECT
  'Analyze the past 180 days of competitor intelligence data to produce a comprehensive semi-annual strategic assessment of the competitive landscape.

Compare to the previous 180-day report for half-over-half trend analysis.

Review the SafelyYou Master Context for company positioning and priorities.

Focus the analysis on:
- Half-year strategic evolution and market trajectory
- Fundamental competitive landscape changes
- Sustained organizational and talent shifts across competitors
- Technology and product direction over 6 months
- Market maturation signals and industry consolidation
- Investment and funding patterns across the sector
- Regulatory and policy developments
- Long-horizon strategic threats and opportunities for SafelyYou

Format the output as:
- Executive Summary (500 words max)
- Semi-Annual Strategic Overview [The big picture]
- Competitive Landscape Evolution [6-month view of who is doing what]
- Strategic Threat Matrix [Comprehensive threat ranking with evidence]
- Market & Industry Dynamics [Sector-level analysis]
- Technology & Innovation Trends [Where the industry is heading]
- 12-Month Forward Outlook [Key predictions and scenarios]
- Recommended Strategic Priorities [Top 5 actions for the next half]
- Provide links to the most significant posts mentioned.

Output format: Markdown .md
Title: ''H[x] yyyy - Semi-Annual Strategic Intelligence Report''

Final goal: Deliver a semi-annual strategic intelligence report that provides SafelyYou leadership with a comprehensive competitive assessment for long-range strategic planning.',
  ARRAY['market trends', 'strategic positioning', 'hiring patterns', 'M&A activity', 'product launches', 'regulatory changes', 'funding & investment'],
  'detailed',
  1,
  18,
  'google/gemini-2.0-flash-001',
  true,
  '180day',
  'off'
WHERE NOT EXISTS (SELECT 1 FROM digest_config WHERE digest_type = '180day');
