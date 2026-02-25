import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerUser, unauthorizedResponse } from '@/lib/auth-server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  try {
    const { pid } = await params;
    const productId = parseInt(pid, 10);
    if (isNaN(productId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }
    const body = await request.json() as Record<string, unknown>;

    const { data, error } = await supabaseAdmin
      .from('competitor_products')
      .update({
        name: body.name,
        description: body.description,
        features: body.features,
        pricing: body.pricing,
        technology: body.technology,
        limitations: body.limitations,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  try {
    const { pid } = await params;
    const productId = parseInt(pid, 10);
    if (isNaN(productId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('competitor_products')
      .delete()
      .eq('id', productId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
