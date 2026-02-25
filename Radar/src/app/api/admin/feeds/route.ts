import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerUser, unauthorizedResponse } from '@/lib/auth-server';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('feeds')
      .select(`
        id,
        name,
        url,
        is_job_board,
        competitor_id,
        last_fetched_at,
        competitors (name)
      `)
      .order('competitor_id');

    if (error) throw error;

    const feeds = (data || []).map(f => {
      // Supabase returns joined data as object or array depending on relationship
      const comp = f.competitors as { name: string } | { name: string }[] | null;
      const competitorName = Array.isArray(comp) ? comp[0]?.name : comp?.name;
      return {
        id: f.id,
        name: f.name,
        url: f.url,
        is_job_board: f.is_job_board,
        competitor_id: f.competitor_id,
        competitor_name: competitorName || 'Unknown',
        last_fetched_at: f.last_fetched_at,
      };
    });

    return NextResponse.json({ feeds });
  } catch (error) {
    console.error('Error fetching feeds:', error);
    return NextResponse.json({ error: 'Failed to fetch feeds' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json() as { name?: unknown; url?: unknown; is_job_board?: unknown; competitor_id?: unknown };
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const url = typeof body.url === 'string' ? body.url.trim() : '';
    const is_job_board = body.is_job_board === true;
    const competitor_id = typeof body.competitor_id === 'number' ? body.competitor_id : 0;

    if (!name || !url || !competitor_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use service role to bypass RLS for admin writes
    const { error } = await supabaseAdmin
      .from('feeds')
      .insert({ name, url, is_job_board, competitor_id });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding feed:', error);
    return NextResponse.json({ error: 'Failed to add feed' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json() as { id?: unknown; name?: unknown; url?: unknown; is_job_board?: unknown; competitor_id?: unknown };
    const id = typeof body.id === 'number' ? body.id : null;
    const name = typeof body.name === 'string' ? body.name.trim() : undefined;
    const url = typeof body.url === 'string' ? body.url.trim() : undefined;
    const is_job_board = typeof body.is_job_board === 'boolean' ? body.is_job_board : undefined;
    const competitor_id = typeof body.competitor_id === 'number' ? body.competitor_id : undefined;

    if (!id) {
      return NextResponse.json({ error: 'Missing feed ID' }, { status: 400 });
    }

    // Use service role to bypass RLS for admin writes
    const { error } = await supabaseAdmin
      .from('feeds')
      .update({ name, url, is_job_board, competitor_id })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating feed:', error);
    return NextResponse.json({ error: 'Failed to update feed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing feed ID' }, { status: 400 });
    }

    // Use service role to bypass RLS for admin writes
    const { error } = await supabaseAdmin
      .from('feeds')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting feed:', error);
    return NextResponse.json({ error: 'Failed to delete feed' }, { status: 500 });
  }
}
