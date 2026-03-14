import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Helper to extract competitor name from Supabase join (handles array or object)
function getCompetitorName(comp: unknown): string {
  if (Array.isArray(comp)) return (comp[0] as { name?: string })?.name || 'Unknown';
  return (comp as { name?: string })?.name || 'Unknown';
}

// Get ISO week start (Monday) for a date string
function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
  return monday.toISOString().split('T')[0];
}

export async function GET() {
  // Fetch all events with competitor info for aggregation
  const [eventsResult, industryResult] = await Promise.all([
    supabaseAdmin
      .from('competitor_events')
      .select(`
        priority_tier,
        theme,
        route_to,
        published_at,
        competitors!competitor_events_competitor_id_fkey (
          name
        )
      `),
    supabaseAdmin
      .from('industry_news')
      .select('source_name', { count: 'exact' }),
  ]);

  if (eventsResult.error) {
    console.error('Supabase error:', eventsResult.error);
    return NextResponse.json({ error: eventsResult.error.message }, { status: 500 });
  }

  // Filter out "Industry News" pseudo-competitor — it's not a real competitor
  const allEvents = (eventsResult.data || []).filter(e => getCompetitorName(e.competitors) !== 'Industry News');

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

  // Weekly timeline (events by week and competitor)
  const weeklyMap: Record<string, Record<string, number>> = {};
  for (const e of allEvents) {
    if (!e.published_at) continue;
    const week = getWeekStart(e.published_at);
    const name = getCompetitorName(e.competitors);

    if (!weeklyMap[week]) weeklyMap[week] = {};
    weeklyMap[week][name] = (weeklyMap[week][name] || 0) + 1;
  }

  // Build weekly timeline as flat records with one key per competitor
  const allCompetitors = Object.keys(competitorCounts).sort();
  const weeklyTimeline = Object.keys(weeklyMap)
    .sort()
    .map(week => {
      const row: Record<string, string | number> = { week };
      for (const comp of allCompetitors) {
        row[comp] = weeklyMap[week][comp] || 0;
      }
      return row;
    });

  // Competitor × Theme matrix
  const matrixMap: Record<string, Record<string, number>> = {};
  for (const e of allEvents) {
    const name = getCompetitorName(e.competitors);
    const theme = e.theme || 'Unknown';
    if (!matrixMap[name]) matrixMap[name] = {};
    matrixMap[name][theme] = (matrixMap[name][theme] || 0) + 1;
  }
  const allThemes = [...new Set(allEvents.map(e => e.theme || 'Unknown'))].sort();
  const competitorThemeMatrix = allCompetitors.map(competitor => ({
    competitor,
    themes: allThemes.map(theme => ({
      theme,
      count: matrixMap[competitor]?.[theme] || 0,
    })),
  }));

  // Route distribution
  const routeCounts: Record<string, number> = {};
  for (const e of allEvents) {
    const route = e.route_to || 'Unknown';
    routeCounts[route] = (routeCounts[route] || 0) + 1;
  }
  const routeDistribution = Object.entries(routeCounts)
    .map(([route_to, count]) => ({ route_to, count }))
    .sort((a, b) => b.count - a.count);

  // Industry news stats
  const industryNewsCount = industryResult.count || 0;
  const industrySourceCounts: Record<string, number> = {};
  for (const r of (industryResult.data || [])) {
    const src = r.source_name || 'Unknown';
    industrySourceCounts[src] = (industrySourceCounts[src] || 0) + 1;
  }
  const industryNewsSources = Object.entries(industrySourceCounts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    tierDistribution,
    themeDistribution,
    competitorActivity,
    weeklyTimeline,
    competitorThemeMatrix,
    routeDistribution,
    totalEvents: allEvents.length,
    industryNewsCount,
    industryNewsSources,
  });
}
