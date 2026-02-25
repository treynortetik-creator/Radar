import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getServerUser, unauthorizedResponse } from '@/lib/auth-server';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('admin_config')
      .select('key, value');

    if (error) throw error;

    const config: Record<string, string> = {};
    for (const row of data || []) {
      config[row.key] = row.value;
    }

    return NextResponse.json({
      model: config.openrouter_model || 'google/gemini-2.0-flash-001',
      system_prompt: config.system_prompt || '',
      last_ingest: config.last_ingest || null,
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json() as { model?: unknown; system_prompt?: unknown };
    const model = typeof body.model === 'string' ? body.model : undefined;
    const system_prompt = typeof body.system_prompt === 'string' ? body.system_prompt : undefined;

    // Update model
    if (model) {
      const { error: modelError } = await supabase
        .from('admin_config')
        .upsert({ key: 'openrouter_model', value: model, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (modelError) throw modelError;
    }

    // Update system prompt
    if (system_prompt !== undefined) {
      const { error: promptError } = await supabase
        .from('admin_config')
        .upsert({ key: 'system_prompt', value: system_prompt, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (promptError) throw promptError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving config:', error);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}
