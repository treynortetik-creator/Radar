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
    // The AI generates the full Slack message with a {report_url} placeholder.
    // Replace it with the actual report URL before sending.
    let mrkdwn = (payload.slackSummary || '').trim();
    mrkdwn = mrkdwn.replace(/\{report_url\}/g, payload.reportUrl);

    if (!mrkdwn) {
      mrkdwn = `:rotating_light: Weekly Marketing Intelligence Report - ${payload.weekLabel}\n\nNo summary available for this period.\n\n:bar_chart: Full Report: ${payload.reportUrl}`;
    }

    // Send as plain mrkdwn text — no Block Kit, no invalid_blocks risk.
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        channel,
        text: mrkdwn,
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
        console.error('[Slack] Details:', JSON.stringify(data.response_metadata.messages));
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
