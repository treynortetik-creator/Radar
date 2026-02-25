import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const VALID_TIERS = new Set(['Critical', 'High', 'Medium', 'Low']);
const VALID_THEMES = new Set([
  'Product/Feature', 'Customer Win', 'Partnership/Integration',
  'Funding/Corporate', 'Competitive Attack', 'Pricing/Packaging',
  'Event/Conference', 'Thought Leadership', 'Job Posting',
]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const competitor = searchParams.get('competitor');
  const tierParam = searchParams.get('tier');
  const themeParam = searchParams.get('theme');
  const search = searchParams.get('search');

  // Validate enum params to prevent unexpected filter injection
  const tier = tierParam && VALID_TIERS.has(tierParam) ? tierParam : null;
  const theme = themeParam && VALID_THEMES.has(themeParam) ? themeParam : null;

  const rawLimit = parseInt(searchParams.get('limit') || '100', 10);
  const rawOffset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 100 : Math.min(rawLimit, 500);
  const offset = isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset;

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
    // Get competitor ID first for reliable filtering
    const { data: compData } = await supabase
      .from('competitors')
      .select('id')
      .eq('name', competitor)
      .single();
    
    if (compData) {
      query = query.eq('competitor_id', compData.id);
    } else {
      // Competitor not found - return empty result
      return NextResponse.json({ events: [], total: 0 });
    }
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

  // Order by published date (newest first) as default
  query = query
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

  return NextResponse.json({ events, total: count || 0 });
}
