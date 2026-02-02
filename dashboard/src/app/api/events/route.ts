import { NextRequest, NextResponse } from 'next/server';
import { getDb, CompetitorEvent } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const competitor = searchParams.get('competitor');
  const tier = searchParams.get('tier');
  const theme = searchParams.get('theme');
  const search = searchParams.get('search');
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');

  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, string | number> = {};

  if (competitor) {
    conditions.push('competitor = @competitor');
    params.competitor = competitor;
  }
  if (tier) {
    conditions.push('priority_tier = @tier');
    params.tier = tier;
  }
  if (theme) {
    conditions.push('theme = @theme');
    params.theme = theme;
  }
  if (search) {
    conditions.push('(title LIKE @search OR summary LIKE @search OR key_takeaway LIKE @search)');
    params.search = `%${search}%`;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  const events = db.prepare(`
    SELECT * FROM competitor_events ${where}
    ORDER BY 
      CASE priority_tier 
        WHEN 'Critical' THEN 0 
        WHEN 'High' THEN 1 
        WHEN 'Medium' THEN 2 
        WHEN 'Low' THEN 3 
      END,
      published_at DESC
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit, offset }) as CompetitorEvent[];

  const total = db.prepare(`SELECT COUNT(*) as count FROM competitor_events ${where}`).get(params) as { count: number };

  return NextResponse.json({ events, total: total.count });
}
