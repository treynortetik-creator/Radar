import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerUser, unauthorizedResponse } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const competitorId = parseInt(id, 10);
    if (isNaN(competitorId)) {
      return NextResponse.json({ error: 'Invalid competitor ID' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('competitor_executives')
      .select('*')
      .eq('competitor_id', competitorId)
      .order('is_current', { ascending: false })
      .order('name');

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching executives:', error);
    return NextResponse.json({ error: 'Failed to fetch executives' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  try {
    const { id } = await params;
    const competitorId = parseInt(id, 10);
    if (isNaN(competitorId)) {
      return NextResponse.json({ error: 'Invalid competitor ID' }, { status: 400 });
    }
    const body = await request.json() as Record<string, unknown>;

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!name || !title) {
      return NextResponse.json({ error: 'name and title are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('competitor_executives')
      .insert({
        competitor_id: competitorId,
        name,
        title,
        linkedin_url: typeof body.linkedin_url === 'string' ? body.linkedin_url || null : null,
        background: typeof body.background === 'string' ? body.background || null : null,
        started_role: typeof body.started_role === 'string' ? body.started_role || null : null,
        is_current: body.is_current === false ? false : true,
        source: typeof body.source === 'string' ? body.source || null : null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating executive:', error);
    return NextResponse.json({ error: 'Failed to create executive' }, { status: 500 });
  }
}
