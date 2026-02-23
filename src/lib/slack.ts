interface SlackPostResult {
  ok: boolean;
  ts?: string;
  error?: string;
  skipped?: boolean;
}

interface SlackDigestPayload {
  weekLabel: string;
  digestContent: string;
  eventCount: number;
  industryNewsCount: number;
  competitorBreakdown: Record<string, number>;
  industryBreakdown: Record<string, number>;
}

function clip(text: string, max = 2900): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function formatBreakdown(breakdown: Record<string, number>): string {
  const rows = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  if (rows.length === 0) return 'None';
  return rows.map(([key, count]) => `${key}: ${count}`).join(' | ');
}

function buildBlocks(payload: SlackDigestPayload): unknown[] {
  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: `SafelyYou Competitive Intel - Week of ${payload.weekLabel}` },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Competitor Events*\n${payload.eventCount}` },
        { type: 'mrkdwn', text: `*Industry News (Major/Notable)*\n${payload.industryNewsCount}` },
      ],
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Competitor Breakdown*\n${clip(formatBreakdown(payload.competitorBreakdown), 1000)}` },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Industry Breakdown*\n${clip(formatBreakdown(payload.industryBreakdown), 1000)}` },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: clip(payload.digestContent) },
    },
  ];
}

export async function postDigestToSlack(payload: SlackDigestPayload): Promise<SlackPostResult> {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_INTEL_CHANNEL_ID;

  if (!token) {
    console.warn('[Slack] SLACK_BOT_TOKEN not set. Skipping Slack post.');
    return { ok: false, skipped: true, error: 'SLACK_BOT_TOKEN not set' };
  }
  if (!channel) {
    console.warn('[Slack] SLACK_INTEL_CHANNEL_ID not set. Skipping Slack post.');
    return { ok: false, skipped: true, error: 'SLACK_INTEL_CHANNEL_ID not set' };
  }

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        channel,
        text: clip(payload.digestContent, 3000),
        blocks: buildBlocks(payload),
        unfurl_links: false,
        unfurl_media: false,
      }),
    });

    const data = (await response.json()) as { ok?: boolean; error?: string; ts?: string };
    if (!response.ok || !data.ok) {
      const error = data.error || `HTTP ${response.status}`;
      console.error('[Slack] Failed to post digest:', error);
      return { ok: false, error };
    }

    return { ok: true, ts: data.ts };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Slack error';
    console.error('[Slack] Post exception:', message);
    return { ok: false, error: message };
  }
}
