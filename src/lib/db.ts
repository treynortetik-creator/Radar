import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), '..', 'competitor_radar.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, { readonly: true });
  }
  return db;
}

export interface CompetitorEvent {
  id: number;
  url_hash: string;
  title: string;
  url: string;
  summary: string;
  published_at: string;
  competitor: string;
  feed_name: string;
  is_job_board: number;
  theme: string;
  threat_level: number;
  strategic_relevance: number;
  content_type_weight: number;
  priority_score: number;
  priority_tier: 'Low' | 'Medium' | 'High' | 'Critical';
  route_to: string;
  key_takeaway: string;
  auto_flag_triggers: string;
  created_at: string;
  synced_to_sheet: number;
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
