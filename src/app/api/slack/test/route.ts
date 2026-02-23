import { NextResponse } from 'next/server';

export async function POST() {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_INTEL_CHANNEL_ID;

  if (!token || !channel) {
    return NextResponse.json(
      { error: 'Slack not configured (missing SLACK_BOT_TOKEN or SLACK_INTEL_CHANNEL_ID)' },
      { status: 400 },
    );
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
        text: 'Radar Slack integration test — connection verified!',
        unfurl_links: false,
      }),
    });

    const data = (await response.json()) as { ok?: boolean; error?: string; ts?: string };
    if (!data.ok) {
      return NextResponse.json({ error: data.error || 'Slack API error' }, { status: 500 });
    }

    return NextResponse.json({ success: true, ts: data.ts });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
