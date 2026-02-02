import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  
  const competitors = db.prepare(`
    SELECT 
      competitor,
      COUNT(*) as total_events,
      SUM(CASE WHEN priority_tier = 'Critical' THEN 1 ELSE 0 END) as critical_count,
      SUM(CASE WHEN priority_tier = 'High' THEN 1 ELSE 0 END) as high_count,
      SUM(CASE WHEN priority_tier = 'Medium' THEN 1 ELSE 0 END) as medium_count,
      SUM(CASE WHEN priority_tier = 'Low' THEN 1 ELSE 0 END) as low_count,
      MAX(published_at) as latest_event,
      AVG(priority_score) as avg_priority
    FROM competitor_events
    GROUP BY competitor
    ORDER BY SUM(CASE WHEN priority_tier IN ('Critical','High') THEN 1 ELSE 0 END) DESC
  `).all();

  return NextResponse.json(competitors);
}
