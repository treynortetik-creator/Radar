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
      .from('competitor_products')
      .select('*')
      .eq('competitor_id', competitorId)
      .order('name');

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
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
      .from('competitor_products')
      .insert({
        competitor_id: competitorId,
        name: body.name,
        description: body.description || null,
        features: body.features || null,
        pricing: body.pricing || null,
        technology: body.technology || null,
        limitations: body.limitations || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
