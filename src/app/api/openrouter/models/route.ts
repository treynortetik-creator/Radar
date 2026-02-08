import { NextResponse } from 'next/server';

interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
}

let cachedModels: OpenRouterModel[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function GET() {
  try {
    const now = Date.now();
    if (cachedModels && now - cacheTimestamp < CACHE_TTL) {
      return NextResponse.json({ models: cachedModels });
    }

    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || ''}`,
      },
    });

    if (!res.ok) throw new Error(`OpenRouter API error: ${res.status}`);

    const data = await res.json();

    const models = (data.data || [])
      .filter((m: OpenRouterModel) => m.id && m.name)
      .map((m: OpenRouterModel) => ({
        id: m.id,
        name: m.name,
        pricing: m.pricing,
        context_length: m.context_length,
      }))
      .sort((a: OpenRouterModel, b: OpenRouterModel) => a.name.localeCompare(b.name));

    cachedModels = models;
    cacheTimestamp = now;

    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    return NextResponse.json({
      models: [
        { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', pricing: { prompt: '0.0000001', completion: '0.0000003' }, context_length: 1048576 },
        { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', pricing: { prompt: '0.000003', completion: '0.000015' }, context_length: 200000 },
        { id: 'openai/gpt-4o', name: 'GPT-4o', pricing: { prompt: '0.0000025', completion: '0.00001' }, context_length: 128000 },
      ],
      fallback: true
    });
  }
}
