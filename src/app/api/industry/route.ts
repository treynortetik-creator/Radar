import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

function parseBoolean(value: string | null): boolean | null {
  if (value === null) return null;
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tier = searchParams.get('tier');
    const source = searchParams.get('source');
    const isRead = parseBoolean(searchParams.get('is_read'));
    const dateFrom = searchParams.get('date_from') || searchParams.get('start_date');
    const dateTo = searchParams.get('date_to') || searchParams.get('end_date');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    let query = supabase
      .from('industry_news')
      .select('*', { count: 'exact' });

    if (tier) query = query.eq('relevance_tier', tier);
    if (source) query = query.eq('source_name', source);
    if (isRead !== null) query = query.eq('is_read', isRead);
    if (dateFrom) query = query.gte('published_at', dateFrom);
    if (dateTo) query = query.lte('published_at', dateTo);

    const { data, error, count } = await query
      .order('published_at', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      records: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching industry news:', error);
    return NextResponse.json({ error: 'Failed to fetch industry news' }, { status: 500 });
  }
}
