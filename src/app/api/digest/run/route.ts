import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateDigest } from '@/lib/digest';
import { postDigestToSlack } from '@/lib/slack';

// Allow up to 5 minutes for frontier thinking models
export const maxDuration = 300;

function getAppUrl(): string {
  return process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export async function POST() {
  try {
    const result = await generateDigest();

    // 1. Save digest first
    const { data, error } = await supabaseAdmin
      .from('weekly_digests')
      .insert({
        week_start: result.period_start,
        week_end: result.period_end,
        content: result.content,
        summary: result.summary,
        event_count: result.event_count,
        industry_news_count: result.industry_news_count,
        competitor_breakdown: result.competitor_breakdown,
        industry_breakdown: result.industry_breakdown,
        model_used: result.model_used,
        tokens_used: result.tokens_used,
        slack_posted: false,
        status: 'generated',
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Post to Slack with report link
    const reportUrl = `${getAppUrl()}/digest/${data.id}`;
    const slackResult = await postDigestToSlack({
      weekLabel: result.period_end,
      slackSummary: result.slack_summary,
      eventCount: result.event_count,
      industryNewsCount: result.industry_news_count,
      competitorBreakdown: result.competitor_breakdown,
      industryBreakdown: result.industry_breakdown,
      reportUrl,
    });

    // 3. Update Slack delivery status
    if (slackResult.ok || slackResult.error) {
      await supabaseAdmin
        .from('weekly_digests')
        .update({
          slack_posted: slackResult.ok,
          slack_ts: slackResult.ts || null,
          slack_error: slackResult.ok ? null : (slackResult.error || null),
        })
        .eq('id', data.id);
    }

    return NextResponse.json({
      success: true,
      digest: { ...data, slack_posted: slackResult.ok },
    });
  } catch (error) {
    console.error('Error generating digest:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate digest';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
