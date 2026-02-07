import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eid: string }> }
) {
  try {
    const { eid } = await params;
    const executiveId = parseInt(eid);
    const body = await request.json();

    const { data, error } = await supabaseAdmin
      .from('competitor_executives')
      .update({
        name: body.name,
        title: body.title,
        linkedin_url: body.linkedin_url,
        background: body.background,
        started_role: body.started_role,
        is_current: body.is_current,
        source: body.source,
        updated_at: new Date().toISOString(),
      })
      .eq('id', executiveId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating executive:', error);
    return NextResponse.json({ error: 'Failed to update executive' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eid: string }> }
) {
  try {
    const { eid } = await params;
    const executiveId = parseInt(eid);

    const { error } = await supabaseAdmin
      .from('competitor_executives')
      .delete()
      .eq('id', executiveId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting executive:', error);
    return NextResponse.json({ error: 'Failed to delete executive' }, { status: 500 });
  }
}
