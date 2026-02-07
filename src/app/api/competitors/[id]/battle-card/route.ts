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
      .from('battle_cards')
      .select('*')
      .eq('competitor_id', competitorId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return NextResponse.json(data || null);
  } catch (error) {
    console.error('Error fetching battle card:', error);
    return NextResponse.json({ error: 'Failed to fetch battle card' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const competitorId = parseInt(id);
    const body = await request.json();

    const { data: existing } = await supabaseAdmin
      .from('battle_cards')
      .select('id')
      .eq('competitor_id', competitorId)
      .single();

    const payload = {
      competitor_id: competitorId,
      when_they_come_up: body.when_they_come_up,
      their_pitch: body.their_pitch,
      our_counter: body.our_counter,
      landmines: body.landmines,
      proof_points: body.proof_points,
      objection_handling: body.objection_handling,
      last_reviewed_at: body.last_reviewed_at || null,
      updated_at: new Date().toISOString(),
    };

    let data, error;
    if (existing) {
      ({ data, error } = await supabaseAdmin
        .from('battle_cards')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single());
    } else {
      ({ data, error } = await supabaseAdmin
        .from('battle_cards')
        .insert(payload)
        .select()
        .single());
    }

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating battle card:', error);
    return NextResponse.json({ error: 'Failed to update battle card' }, { status: 500 });
  }
}
