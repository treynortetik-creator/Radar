-- ============================================
-- WEEKLY INTEL DIGEST FEATURE
-- ============================================

-- Weekly digest storage
CREATE TABLE weekly_digests (
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

-- Digest prompt configuration (admin-managed)
CREATE TABLE digest_config (
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

-- Indexes
CREATE INDEX idx_digests_week ON weekly_digests(week_end DESC);
CREATE INDEX idx_digests_status ON weekly_digests(status);

-- Row Level Security
ALTER TABLE weekly_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read" ON weekly_digests FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read" ON digest_config FOR SELECT USING (true);
CREATE POLICY "Allow service write" ON weekly_digests FOR ALL USING (true);
CREATE POLICY "Allow service write" ON digest_config FOR ALL USING (true);

-- Seed default digest configuration
INSERT INTO digest_config (system_prompt, focus_areas, output_format, delivery_day, delivery_hour, model)
VALUES (
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
);
