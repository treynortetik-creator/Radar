import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerUser, unauthorizedResponse } from '@/lib/auth-server';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('digest_config')
      .select('*')
      .eq('is_active', true)
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return NextResponse.json({
      config: data || null,
    });
  } catch (error) {
    console.error('Error fetching digest config:', error);
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json() as Record<string, unknown>;
    const { id, system_prompt, focus_areas, output_format, delivery_day, delivery_hour, model } = body;

    if (!id) {
      return NextResponse.json({ error: 'Config ID required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (system_prompt !== undefined) updates.system_prompt = system_prompt;
    if (focus_areas !== undefined) updates.focus_areas = focus_areas;
    if (output_format !== undefined) updates.output_format = output_format;
    if (delivery_day !== undefined) updates.delivery_day = delivery_day;
    if (delivery_hour !== undefined) updates.delivery_hour = delivery_hour;
    if (model !== undefined) updates.model = model;

    const { data, error } = await supabaseAdmin
      .from('digest_config')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, config: data });
  } catch (error) {
    console.error('Error updating digest config:', error);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
