import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
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
      master_context: config.master_context || '',
      last_ingest: config.last_ingest || null,
      industry_model: config.industry_openrouter_model || 'google/gemini-2.0-flash-001',
      industry_system_prompt: config.industry_system_prompt || '',
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { model, system_prompt } = body;

    // Update model
    if (model) {
      const { error: modelError } = await supabaseAdmin
        .from('admin_config')
        .upsert({ key: 'openrouter_model', value: model, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (modelError) throw modelError;
    }

    // Update system prompt
    if (system_prompt !== undefined) {
      const { error: promptError } = await supabaseAdmin
        .from('admin_config')
        .upsert({ key: 'system_prompt', value: system_prompt, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (promptError) throw promptError;
    }

    // Update master context
    if (body.master_context !== undefined) {
      const { error: contextError } = await supabaseAdmin
        .from('admin_config')
        .upsert({ key: 'master_context', value: body.master_context, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (contextError) throw contextError;
    }

    // Update industry model
    if (body.industry_model !== undefined) {
      const { error: industryModelError } = await supabaseAdmin
        .from('admin_config')
        .upsert({ key: 'industry_openrouter_model', value: body.industry_model, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (industryModelError) throw industryModelError;
    }

    // Update industry system prompt
    if (body.industry_system_prompt !== undefined) {
      const { error: industryPromptError } = await supabaseAdmin
        .from('admin_config')
        .upsert({ key: 'industry_system_prompt', value: body.industry_system_prompt, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (industryPromptError) throw industryPromptError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving config:', error);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}
