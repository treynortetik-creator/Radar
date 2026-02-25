import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper to extract competitor name from Supabase join (handles array or object)
function getCompetitorName(comp: unknown): string {
  if (Array.isArray(comp)) return (comp[0] as { name?: string })?.name || 'Unknown';
  return (comp as { name?: string })?.name || 'Unknown';
}

export async function GET() {
  // Fetch events for aggregation — limit to last 2000 to avoid unbounded queries
  const { data: events, error } = await supabase
    .from('competitor_events')
    .select(`
      priority_tier,
      theme,
      route_to,
      published_at,
      competitors!competitor_events_competitor_id_fkey (
        name
      )
    `)
    .order('published_at', { ascending: false })
    .limit(2000);

  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const allEvents = events || [];

  // Tier distribution
  const tierCounts: Record<string, number> = {};
  for (const e of allEvents) {
    const tier = e.priority_tier || 'Unknown';
    tierCounts[tier] = (tierCounts[tier] || 0) + 1;
  }
  const tierDistribution = Object.entries(tierCounts).map(([priority_tier, count]) => ({
    priority_tier,
    count,
  }));

  // Theme distribution
  const themeCounts: Record<string, number> = {};
  for (const e of allEvents) {
    const theme = e.theme || 'Unknown';
    themeCounts[theme] = (themeCounts[theme] || 0) + 1;
  }
  const themeDistribution = Object.entries(themeCounts)
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count);

  // Competitor activity
  const competitorCounts: Record<string, number> = {};
  for (const e of allEvents) {
    const name = getCompetitorName(e.competitors);
    competitorCounts[name] = (competitorCounts[name] || 0) + 1;
  }
  const competitorActivity = Object.entries(competitorCounts)
    .map(([competitor, count]) => ({ competitor, count }))
    .sort((a, b) => b.count - a.count);

  // Timeline (events by date and competitor)
  const timelineMap: Record<string, Record<string, number>> = {};
  for (const e of allEvents) {
    if (!e.published_at) continue;
    const date = e.published_at.split('T')[0]; // Extract date part
    const name = getCompetitorName(e.competitors);

    if (!timelineMap[date]) timelineMap[date] = {};
    timelineMap[date][name] = (timelineMap[date][name] || 0) + 1;
  }
  const timeline = Object.entries(timelineMap)
    .flatMap(([date, competitors]) =>
      Object.entries(competitors).map(([competitor, count]) => ({
        date,
        competitor,
        count,
      }))
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  // Route distribution
  const routeCounts: Record<string, number> = {};
  for (const e of allEvents) {
    const route = e.route_to || 'Unknown';
    routeCounts[route] = (routeCounts[route] || 0) + 1;
  }
  const routeDistribution = Object.entries(routeCounts)
    .map(([route_to, count]) => ({ route_to, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    tierDistribution,
    themeDistribution,
    competitorActivity,
    timeline,
    routeDistribution,
    totalEvents: allEvents.length,
  });
}
