import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  
  const tierDistribution = db.prepare(`
    SELECT priority_tier, COUNT(*) as count 
    FROM competitor_events 
    GROUP BY priority_tier
  `).all();

  const themeDistribution = db.prepare(`
    SELECT theme, COUNT(*) as count 
    FROM competitor_events 
    GROUP BY theme 
    ORDER BY count DESC
  `).all();

  const competitorActivity = db.prepare(`
    SELECT competitor, COUNT(*) as count 
    FROM competitor_events 
    GROUP BY competitor 
    ORDER BY count DESC
  `).all();

  const timeline = db.prepare(`
    SELECT 
      published_at as date,
      competitor,
      COUNT(*) as count
    FROM competitor_events
    WHERE published_at IS NOT NULL
    GROUP BY published_at, competitor
    ORDER BY published_at
  `).all();

  const routeDistribution = db.prepare(`
    SELECT route_to, COUNT(*) as count 
    FROM competitor_events 
    GROUP BY route_to 
    ORDER BY count DESC
  `).all();

  const totalEvents = db.prepare('SELECT COUNT(*) as count FROM competitor_events').get() as { count: number };

  return NextResponse.json({
    tierDistribution,
    themeDistribution,
    competitorActivity,
    timeline,
    routeDistribution,
    totalEvents: totalEvents.count,
  });
}
