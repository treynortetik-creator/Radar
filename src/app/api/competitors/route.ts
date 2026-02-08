import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  // Get all events with competitor info
  const { data: events, error } = await supabaseAdmin
    .from('competitor_events')
    .select(`
      priority_tier,
      priority_score,
      published_at,
      competitor_id,
      competitors!competitor_events_competitor_id_fkey (
        id,
        name
      )
    `);

  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggregate by competitor
  const competitorStats: Record<string, {
    competitor: string;
    competitor_id: number;
    total_events: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    latest_event: string | null;
    priority_scores: number[];
  }> = {};

  for (const event of events || []) {
    // Supabase returns joined data as object or array depending on relationship
    const comp = event.competitors as { id: number; name: string } | { id: number; name: string }[] | null;
    const competitor = Array.isArray(comp) ? comp[0] : comp;
    const name = competitor?.name || 'Unknown';
    const competitorId = competitor?.id || event.competitor_id || 0;

    if (!competitorStats[name]) {
      competitorStats[name] = {
        competitor: name,
        competitor_id: competitorId,
        total_events: 0,
        critical_count: 0,
        high_count: 0,
        medium_count: 0,
        low_count: 0,
        latest_event: null,
        priority_scores: [],
      };
    }

    const stats = competitorStats[name];
    stats.total_events++;

    switch (event.priority_tier) {
      case 'Critical': stats.critical_count++; break;
      case 'High': stats.high_count++; break;
      case 'Medium': stats.medium_count++; break;
      case 'Low': stats.low_count++; break;
    }

    if (event.published_at) {
      if (!stats.latest_event || event.published_at > stats.latest_event) {
        stats.latest_event = event.published_at;
      }
    }

    if (event.priority_score != null) {
      stats.priority_scores.push(event.priority_score);
    }
  }

  // Convert to array and calculate averages
  const competitors = Object.values(competitorStats)
    .map(stats => ({
      competitor: stats.competitor,
      competitor_id: stats.competitor_id,
      total_events: stats.total_events,
      critical_count: stats.critical_count,
      high_count: stats.high_count,
      medium_count: stats.medium_count,
      low_count: stats.low_count,
      latest_event: stats.latest_event,
      avg_priority: stats.priority_scores.length > 0
        ? stats.priority_scores.reduce((a, b) => a + b, 0) / stats.priority_scores.length
        : null,
    }))
    .sort((a, b) => (b.critical_count + b.high_count) - (a.critical_count + a.high_count));

  return NextResponse.json(competitors);
}
