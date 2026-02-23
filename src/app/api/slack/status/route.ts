import { NextResponse } from 'next/server';

export async function GET() {
  const hasToken = !!process.env.SLACK_BOT_TOKEN;
  const hasChannel = !!process.env.SLACK_INTEL_CHANNEL_ID;

  return NextResponse.json({
    configured: hasToken && hasChannel,
    token_set: hasToken,
    channel_set: hasChannel,
  });
}
