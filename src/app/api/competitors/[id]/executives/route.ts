import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const competitorId = parseInt(id);

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
  try {
    const { id } = await params;
    const competitorId = parseInt(id);
    const body = await request.json();

    const { data, error } = await supabaseAdmin
      .from('competitor_executives')
      .insert({
        competitor_id: competitorId,
        name: body.name,
        title: body.title,
        linkedin_url: body.linkedin_url || null,
        background: body.background || null,
        started_role: body.started_role || null,
        is_current: body.is_current ?? true,
        source: body.source || null,
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
