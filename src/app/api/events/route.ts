import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const competitor = searchParams.get('competitor');
  const tier = searchParams.get('tier');
  const theme = searchParams.get('theme');
  const search = searchParams.get('search');
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');

  // Build query with join to get competitor name
  let query = supabase
    .from('competitor_events')
    .select(`
      *,
      competitors!competitor_events_competitor_id_fkey (
        name,
        slug
      )
    `, { count: 'exact' });

  // Apply filters
  if (competitor) {
    // Filter by competitor name via the joined table
    query = query.eq('competitors.name', competitor);
  }
  if (tier) {
    query = query.eq('priority_tier', tier);
  }
  if (theme) {
    query = query.eq('theme', theme);
  }
  if (search) {
    query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%,key_takeaway.ilike.%${search}%`);
  }

  // Order by priority tier then published date
  query = query
    .order('priority_tier', { ascending: true, nullsFirst: false })
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform to flatten competitor name
  const events = (data || []).map((event: Record<string, unknown>) => {
    // Supabase returns joined data as object or array depending on relationship
    const comp = event.competitors as { name: string; slug: string } | { name: string; slug: string }[] | null;
    const competitorData = Array.isArray(comp) ? comp[0] : comp;
    return {
      ...event,
      competitor: competitorData?.name || 'Unknown',
      competitor_slug: competitorData?.slug || '',
      competitors: undefined, // Remove nested object
    } as Record<string, unknown>;
  });

  // Custom sort for priority_tier since Supabase doesn't support CASE ordering
  const tierOrder: Record<string, number> = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
  events.sort((a, b) => {
    const tierA = tierOrder[String(a.priority_tier || '')] ?? 4;
    const tierB = tierOrder[String(b.priority_tier || '')] ?? 4;
    if (tierA !== tierB) return tierA - tierB;
    // Secondary sort by published_at descending
    const dateA = a.published_at ? new Date(String(a.published_at)).getTime() : 0;
    const dateB = b.published_at ? new Date(String(b.published_at)).getTime() : 0;
    return dateB - dateA;
  });

  return NextResponse.json({ events, total: count || 0 });
}
