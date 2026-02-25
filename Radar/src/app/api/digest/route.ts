import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawLimit = parseInt(searchParams.get('limit') || '20', 10);
    const rawOffset = parseInt(searchParams.get('offset') || '0', 10);
    const limit = isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, 100);
    const offset = isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset;

    const { data, error, count } = await supabase
      .from('weekly_digests')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      digests: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching digests:', error);
    return NextResponse.json({ error: 'Failed to fetch digests' }, { status: 500 });
  }
}
