interface SlackPostResult {
  ok: boolean;
  ts?: string;
  error?: string;
  skipped?: boolean;
}

export interface SlackDigestPayload {
  weekLabel: string;
  slackSummary: string;
  eventCount: number;
  industryNewsCount: number;
  competitorBreakdown: Record<string, number>;
  industryBreakdown: Record<string, number>;
  reportUrl: string;
}

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function formatBreakdown(breakdown: Record<string, number>): string {
  const rows = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  if (rows.length === 0) return 'None';
  return rows.map(([key, count]) => `${key}: ${count}`).join('  |  ');
}

function buildBlocks(payload: SlackDigestPayload): unknown[] {
  // Guard: Slack section text must be 1-3000 chars
  const rawSummary = (payload.slackSummary || '').trim();
  const summaryMrkdwn = rawSummary
    ? clip(rawSummary, 3000)
    : 'No executive summary available for this period.';

  // Guard: Slack header text max 150 chars
  const headerText = clip(`\ud83d\udce1 SafelyYou Intel Digest \u2014 Week of ${payload.weekLabel}`, 150);

  // Guard: Slack section field text max 2000 chars
  const competitorField = clip(formatBreakdown(payload.competitorBreakdown || {}), 2000);
  const industryField = clip(formatBreakdown(payload.industryBreakdown || {}), 2000);

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: headerText,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `\ud83c\udfaf *Competitor Events*\n${payload.eventCount ?? 0}` },
        { type: 'mrkdwn', text: `\ud83d\udcf0 *Industry News*\n${payload.industryNewsCount ?? 0}` },
      ],
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `\ud83c\udfc6 *Competitors*\n${competitorField}` },
        { type: 'mrkdwn', text: `\ud83d\udcca *By Tier*\n${industryField}` },
      ],
    },
    { type: 'divider' },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: summaryMrkdwn },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `\ud83d\udcc4 <${payload.reportUrl}|View Full Report>`,
      },
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
    // Fallback text for notifications (plain text, no blocks)
    const fallbackText = `SafelyYou Intel Digest — Week of ${payload.weekLabel}\n${clip(payload.slackSummary, 2900)}\n${payload.reportUrl}`;

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        channel,
        text: clip(fallbackText, 3000),
        blocks: buildBlocks(payload),
        unfurl_links: false,
        unfurl_media: false,
      }),
    });

    const data = (await response.json()) as {
      ok?: boolean; error?: string; ts?: string;
      response_metadata?: { messages?: string[] };
    };
    if (!response.ok || !data.ok) {
      const error = data.error || `HTTP ${response.status}`;
      console.error('[Slack] Failed to post digest:', error);
      if (data.response_metadata?.messages) {
        console.error('[Slack] Block validation details:', JSON.stringify(data.response_metadata.messages));
      }
      return { ok: false, error };
    }

    return { ok: true, ts: data.ts };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Slack error';
    console.error('[Slack] Post exception:', message);
    return { ok: false, error: message };
  }
}
