-- Add slack_prompt column to digest_config for user-editable Slack output formatting
ALTER TABLE digest_config ADD COLUMN IF NOT EXISTS slack_prompt TEXT DEFAULT '';
