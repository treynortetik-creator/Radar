import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateDigest } from '@/lib/digest';

export async function POST() {
  try {
    const result = await generateDigest();

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Store the digest
    const { data, error } = await supabaseAdmin
      .from('weekly_digests')
      .insert({
        week_start: sevenDaysAgo.toISOString().split('T')[0],
        week_end: now.toISOString().split('T')[0],
        content: result.content,
        summary: result.summary,
        event_count: result.event_count,
        industry_news_count: result.industry_news_count,
        competitor_breakdown: result.competitor_breakdown,
        industry_breakdown: result.industry_breakdown,
        model_used: result.model_used,
        tokens_used: result.tokens_used,
        slack_posted: result.slack_posted,
        slack_ts: result.slack_ts,
        slack_error: result.slack_error,
        status: 'generated',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      digest: data,
    });
  } catch (error) {
    console.error('Error generating digest:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate digest';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
