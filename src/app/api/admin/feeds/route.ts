import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
  try {
    const body = await request.json();
    const { name, url, is_job_board, competitor_id } = body;

    if (!name || !url || !competitor_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error } = await supabase
      .from('feeds')
      .insert({ name, url, is_job_board: is_job_board || false, competitor_id });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding feed:', error);
    return NextResponse.json({ error: 'Failed to add feed' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, url, is_job_board, competitor_id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing feed ID' }, { status: 400 });
    }

    const { error } = await supabase
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
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing feed ID' }, { status: 400 });
    }

    const { error } = await supabase
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
