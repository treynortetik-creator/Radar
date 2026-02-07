// Radar database types and constants
// Data access via Supabase - see src/lib/supabase.ts

export interface CompetitorEvent {
  id: number;
  competitor_id: number;
  feed_id: number | null;
  url_hash: string;
  title: string;
  url: string;
  summary: string | null;
  published_at: string | null;
  feed_name: string | null;
  is_job_board: boolean;
  theme: string | null;
  category: string | null;
  threat_level: number | null;
  threat_reasons: string[] | null;
  strategic_relevance: number | null;
  content_type_weight: number | null;
  priority_score: number | null;
  priority_tier: 'Low' | 'Medium' | 'High' | 'Critical' | null;
  route_to: string | null;
  key_takeaway: string | null;
  auto_flag_triggers: string | null;
  is_read: boolean;
  is_actioned: boolean;
  notes: string | null;
  synced_to_sheet: boolean;
  created_at: string;
  // Joined from competitors table
  competitor?: string;
  competitor_slug?: string;
}

export interface Competitor {
  id: number;
  name: string;
  slug: string;
  website: string | null;
  headquarters: string | null;
  founded: string | null;
  employees: string | null;
  description: string | null;
  weaknesses: string[] | null;
  products: string[] | null;
  created_at: string;
}

export interface Feed {
  id: number;
  competitor_id: number;
  url: string;
  name: string | null;
  is_job_board: boolean;
  last_fetched_at: string | null;
  created_at: string;
}

export const COMPETITOR_COLORS: Record<string, string> = {
  'Inspiren': '#CC4125',
  'Sage': '#B4A7D6',
  'VirtuSense': '#9900FF',
  'Amba': '#FF9900',
  'Nobi': '#B7E1CD',
  'CarePredict': '#F9CB9C',
};

export const TIER_COLORS: Record<string, string> = {
  'Critical': '#ef4444',
  'High': '#f97316',
  'Medium': '#eab308',
  'Low': '#22c55e',
};

export const TIER_ORDER = ['Critical', 'High', 'Medium', 'Low'];

// Weekly Digest types
export interface WeeklyDigest {
  id: number;
  week_start: string;
  week_end: string;
  content: string;
  summary: string | null;
  event_count: number | null;
  competitor_breakdown: Record<string, number> | null;
  model_used: string | null;
  prompt_version: number | null;
  tokens_used: number | null;
  cost_estimate: number | null;
  status: string;
  delivered_at: string | null;
  created_at: string;
}

export interface DigestConfig {
  id: number;
  system_prompt: string;
  focus_areas: string[] | null;
  output_format: string;
  delivery_day: number;
  delivery_hour: number;
  model: string;
  is_active: boolean;
  updated_at: string;
}
