-- ============================================================
-- 018: Industry RSS Feeds + Feed Category Column
-- ============================================================
-- Adds a `category` column to the feeds table so feeds can be
-- tagged as 'competitor' (default) or 'industry_news'.
-- Industry news feeds are ingested but excluded from AI threat scoring.
--
-- Also inserts an "Industry News" pseudo-competitor and the 5
-- industry RSS feed sources.
-- ============================================================

-- Step 1: Add category column to feeds table
ALTER TABLE feeds ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'competitor';

-- Update existing feeds to have explicit category
UPDATE feeds SET category = 'competitor' WHERE category IS NULL;

-- Step 2: Insert a pseudo-competitor for industry news feeds
-- (Uses ON CONFLICT DO NOTHING to be idempotent)
INSERT INTO competitors (name, slug, website, description)
VALUES (
  'Industry News',
  'industry-news',
  NULL,
  'Aggregated industry news from senior living trade publications. Not a direct competitor — used for market context.'
)
ON CONFLICT (slug) DO NOTHING;

-- Step 3: Insert the 5 industry RSS feeds
-- Linked to the "Industry News" competitor
INSERT INTO feeds (competitor_id, url, name, is_job_board, category)
SELECT
  c.id,
  feed.url,
  feed.name,
  false,
  'industry_news'
FROM competitors c
CROSS JOIN (
  VALUES
    ('https://www.mcknightsseniorliving.com/feed/', 'McKnight''s Senior Living'),
    ('https://seniorhousingnews.com/feed/', 'Senior Housing News'),
    ('https://leadingage.org/feed/', 'LeadingAge News'),
    ('https://www.argentum.org/feed/', 'Argentum'),
    ('https://www.mcknightsltc.com/feed/', 'McKnight''s LTC News')
) AS feed(url, name)
WHERE c.slug = 'industry-news'
ON CONFLICT DO NOTHING;
