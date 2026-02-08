import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const digestId = parseInt(id);

    if (isNaN(digestId)) {
      return NextResponse.json({ error: 'Invalid digest ID' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('weekly_digests')
      .select('*')
      .eq('id', digestId)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Digest not found' }, { status: 404 });
    }

    return NextResponse.json({ digest: data });
  } catch (error) {
    console.error('Error fetching digest:', error);
    return NextResponse.json({ error: 'Failed to fetch digest' }, { status: 500 });
  }
}
