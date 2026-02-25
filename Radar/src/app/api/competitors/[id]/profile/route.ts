import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
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

    const [competitorRes, executivesRes, productsRes, battleCardRes] = await Promise.all([
      supabase.from('competitors').select('*').eq('id', competitorId).single(),
      supabase.from('competitor_executives').select('*').eq('competitor_id', competitorId).order('is_current', { ascending: false }).order('name'),
      supabase.from('competitor_products').select('*').eq('competitor_id', competitorId).order('name'),
      supabase.from('battle_cards').select('*').eq('competitor_id', competitorId).single(),
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
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  try {
    const { id } = await params;
    const competitorId = parseInt(id, 10);
    if (isNaN(competitorId)) {
      return NextResponse.json({ error: 'Invalid competitor ID' }, { status: 400 });
    }
    const body = await request.json() as Record<string, unknown>;

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
