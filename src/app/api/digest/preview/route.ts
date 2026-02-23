import { NextRequest, NextResponse } from 'next/server';
import { generateDigest } from '@/lib/digest';
import type { DigestType } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const validTypes: DigestType[] = ['weekly', 'monthly', '90day', '180day'];
    const digestType: DigestType = validTypes.includes(body.type) ? body.type : 'weekly';

    const result = await generateDigest(digestType);

    return NextResponse.json({
      success: true,
      content: result.content,
      summary: result.summary,
      event_count: result.event_count,
      competitor_breakdown: result.competitor_breakdown,
      model_used: result.model_used,
      tokens_used: result.tokens_used,
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate preview';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
