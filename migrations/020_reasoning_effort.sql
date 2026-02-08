-- Add reasoning effort column to digest_config
-- Values: 'off', 'low', 'medium', 'high'
ALTER TABLE digest_config ADD COLUMN IF NOT EXISTS reasoning_effort TEXT NOT NULL DEFAULT 'off';
