import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const type = searchParams.get('type'); // 'weekly' | 'monthly' | null (all)

    let query = supabaseAdmin
      .from('weekly_digests')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type === 'weekly' || type === 'monthly') {
      query = query.eq('digest_type', type);
    }

    const { data, error, count } = await query;

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
