import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const competitorId = parseInt(id);

    const [competitorRes, executivesRes, productsRes, battleCardRes] = await Promise.all([
      supabaseAdmin.from('competitors').select('*').eq('id', competitorId).single(),
      supabaseAdmin.from('competitor_executives').select('*').eq('competitor_id', competitorId).order('is_current', { ascending: false }).order('name'),
      supabaseAdmin.from('competitor_products').select('*').eq('competitor_id', competitorId).order('name'),
      supabaseAdmin.from('battle_cards').select('*').eq('competitor_id', competitorId).single(),
    ]);

    if (competitorRes.error) throw competitorRes.error;

    return NextResponse.json({
      ...competitorRes.data,
      executives: executivesRes.data || [],
      products_list: productsRes.data || [],
      battle_card: battleCardRes.data || null,
    });
  } catch (error) {
    console.error('Error fetching competitor profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
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

    const { data, error } = await supabaseAdmin
      .from('competitors')
      .update({
        description: body.description,
        headquarters: body.headquarters,
        website: body.website,
        founded: body.founded,
        employee_count: body.employee_count,
        funding: body.funding,
        market_segments: body.market_segments,
        weaknesses: body.weaknesses,
        updated_at: new Date().toISOString(),
      })
      .eq('id', competitorId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating competitor profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
