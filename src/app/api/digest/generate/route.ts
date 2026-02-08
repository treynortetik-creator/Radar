import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateDigest, extractSummary } from '@/lib/digest';
import type { DigestType } from '@/lib/digest';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const digestType: DigestType = body.type === 'monthly' ? 'monthly' : 'weekly';
    const periodDays = digestType === 'monthly' ? 30 : 7;

    const result = await generateDigest(digestType);

    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - periodDays);

    // Store the digest
    const { data, error } = await supabaseAdmin
      .from('weekly_digests')
      .insert({
        week_start: periodStart.toISOString().split('T')[0],
        week_end: now.toISOString().split('T')[0],
        content: result.content,
        summary: extractSummary(result.content),
        event_count: result.event_count,
        competitor_breakdown: result.competitor_breakdown,
        model_used: result.model_used,
        tokens_used: result.tokens_used,
        digest_type: digestType,
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
