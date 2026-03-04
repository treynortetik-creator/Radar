import type { CompetitorExecutive, CompetitorProduct, BattleCard } from '@/lib/db';

export interface CompetitorData {
  competitor: string;
  total_events: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  latest_event: string;
  avg_priority: number;
}

export interface Event {
  id: number;
  title: string;
  url: string;
  summary: string;
  published_at: string;
  competitor: string;
  theme: string;
  priority_tier: string;
  priority_score: number;
  route_to: string;
  key_takeaway: string;
  threat_level: number;
  strategic_relevance: number;
  content_type_weight: number;
}

export interface ProfileData {
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
  employee_count: string | null;
  funding: string | null;
  market_segments: string[] | null;
  executives: CompetitorExecutive[];
  products_list: CompetitorProduct[];
  battle_card: BattleCard | null;
}
