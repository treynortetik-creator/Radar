'use client';

import { useState, useEffect, useCallback } from 'react';
import { EventCard } from '@/components/EventCard';
import { CompetitorPill } from '@/components/CompetitorBadge';
import { 
  LoadingRadar, 
  SearchIcon, 
  FilterIcon, 
  TargetIcon,
  ShieldIcon,
} from '@/components/icons';

interface Event {
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

interface CompetitorSummary {
  competitor: string;
  total_events: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
}

const TIERS = ['Critical', 'High', 'Medium', 'Low'];
const THEMES = [
  'Product/Feature', 'Customer Win', 'Partnership/Integration',
  'Funding/Corporate', 'Competitive Attack', 'Pricing/Packaging',
  'Event/Conference', 'Thought Leadership', 'Job Posting'
];

// Stat card component with tactical styling
function StatCard({ 
  label, 
  value, 
  variant = 'default', 
  subtext,
  icon: Icon,
}: { 
  label: string; 
  value: number | string; 
  variant?: 'default' | 'critical' | 'high' | 'medium' | 'low' | 'amber'; 
  subtext?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const variants: Record<string, { text: string; accent: string; glow: string }> = {
    default: { text: 'text-slate-100', accent: 'text-slate-500', glow: '' },
    critical: { text: 'text-red-400', accent: 'text-red-400/60', glow: 'shadow-[0_0_20px_-8px_rgba(239,68,68,0.4)]' },
    high: { text: 'text-orange-400', accent: 'text-orange-400/60', glow: '' },
    medium: { text: 'text-yellow-400', accent: 'text-yellow-400/60', glow: '' },
    low: { text: 'text-emerald-400', accent: 'text-emerald-400/60', glow: '' },
    amber: { text: 'text-amber-400', accent: 'text-amber-400/60', glow: 'shadow-[0_0_20px_-8px_rgba(245,158,11,0.3)]' },
  };
  
  const v = variants[variant];
  
  return (
    <div className={`stat-card ${v.glow}`}>
      {Icon && (
        <div className="stat-icon">
          <Icon className="w-8 h-8" />
        </div>
      )}
      <div className={`stat-value ${v.text}`}>{value}</div>
      <div className={`stat-label ${v.accent}`}>{label}</div>
      {subtext && <div className="text-[10px] text-slate-600 mt-0.5">{subtext}</div>}
    </div>
  );
}

const ITEMS_PER_PAGE = 25;

export default function Dashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [competitors, setCompetitors] = useState<CompetitorSummary[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [competitor, setCompetitor] = useState('');
  const [tier, setTier] = useState('');
  const [theme, setTheme] = useState('');

  // Pagination
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (competitor) params.set('competitor', competitor);
    if (tier) params.set('tier', tier);
    if (theme) params.set('theme', theme);
    params.set('limit', String(ITEMS_PER_PAGE));
    params.set('offset', String((page - 1) * ITEMS_PER_PAGE));

    try {
      const res = await fetch(`/api/events?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { events?: Event[]; total?: number };
      setEvents(data.events || []);
      setTotal(data.total || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [search, competitor, tier, theme, page]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, competitor, tier, theme]);

  useEffect(() => {
    fetch('/api/competitors')
      .then(r => r.json())
      .then((data: CompetitorSummary[]) => setCompetitors(data))
      .catch(() => {/* non-fatal */});
  }, []);


  // Calculate total counts from competitors data (for stats cards)
  const totalCritical = competitors.reduce((sum, c) => sum + (c.critical_count || 0), 0);
  const totalHigh = competitors.reduce((sum, c) => sum + (c.high_count || 0), 0);
  const totalMedium = competitors.reduce((sum, c) => sum + (c.medium_count || 0), 0);
  const totalLow = competitors.reduce((sum, c) => sum + (c.low_count || 0), 0);
  const totalAll = competitors.reduce((sum, c) => sum + (c.total_events || 0), 0);

  const handleCompetitorClick = (name: string) => {
    setCompetitor(prev => prev === name ? '' : name);
    setPage(1);
  };

  const hasActiveFilters = !!(search || competitor || tier || theme);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Command Center</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time competitive intelligence monitoring</p>
        </div>
        {hasActiveFilters && (
          <button
            onClick={() => { setSearch(''); setCompetitor(''); setTier(''); setTheme(''); }}
            className="btn-ghost text-xs flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Clear all filters
          </button>
        )}
      </div>
      
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard 
          label="Total Intel" 
          value={totalAll || total} 
          variant="amber"
          icon={TargetIcon}
          subtext={hasActiveFilters ? `${total} filtered` : undefined} 
        />
        <StatCard label="Critical" value={totalCritical} variant="critical" icon={ShieldIcon} />
        <StatCard label="High" value={totalHigh} variant="high" />
        <StatCard label="Medium" value={totalMedium} variant="medium" />
        <StatCard label="Low" value={totalLow} variant="low" />
      </div>

      {/* Competitor Pills */}
      <div className="flex flex-wrap gap-2">
        {competitors.map(c => (
          <CompetitorPill
            key={c.competitor}
            competitor={c.competitor}
            count={c.total_events}
            criticalCount={c.critical_count}
            isActive={competitor === c.competitor}
            onClick={() => handleCompetitorClick(c.competitor)}
          />
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search input */}
        <div className="relative flex-1 min-w-[220px]">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search intel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-10"
          />
        </div>
        
        {/* Filter dropdowns */}
        <div className="flex items-center gap-2">
          <FilterIcon className="w-4 h-4 text-slate-500" />
          <select 
            value={tier} 
            onChange={(e) => setTier(e.target.value)}
            className="input-base py-2 min-w-[120px]"
          >
            <option value="">All Tiers</option>
            {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select 
            value={theme} 
            onChange={(e) => setTheme(e.target.value)}
            className="input-base py-2 min-w-[140px]"
          >
            <option value="">All Themes</option>
            {THEMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Events */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <LoadingRadar className="w-16 h-16 text-amber-500" />
          <span className="text-sm text-slate-500 font-medium">Scanning intel feeds...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="text-red-400 text-sm font-medium">Failed to load events</div>
          <div className="text-slate-500 text-xs">{error}</div>
          <button onClick={() => void fetchEvents()} className="btn-secondary text-xs mt-2">Retry</button>
        </div>
      ) : events.length === 0 ? (
        <EmptyState hasFilters={hasActiveFilters} />
      ) : (
        <div className="space-y-6">
          {/* Flat chronological list - events already sorted by published_at DESC from API */}
          <div className="space-y-3">
            {events.map((e, i) => (
              <div key={e.id} className={`animate-fade-in stagger-${Math.min(i + 1, 5)}`}>
                <EventCard event={e} />
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              itemsPerPage={ITEMS_PER_PAGE}
              setPage={setPage}
            />
          )}
        </div>
      )}
    </div>
  );
}

// Empty state component
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4">
        <SearchIcon className="w-8 h-8 text-slate-600" />
      </div>
      <div className="text-lg font-semibold text-slate-300 mb-1">No intel found</div>
      <div className="text-sm text-slate-500 max-w-sm">
        {hasFilters 
          ? "Try adjusting your filters to see more results"
          : "Intel feed is empty. Run ingestion to populate data."}
      </div>
    </div>
  );
}

// Pagination component
function Pagination({ 
  page, 
  totalPages, 
  total, 
  itemsPerPage,
  setPage 
}: { 
  page: number; 
  totalPages: number; 
  total: number; 
  itemsPerPage: number;
  setPage: (p: number | ((p: number) => number)) => void;
}) {
  return (
    <div className="flex items-center justify-between pt-6 border-t border-slate-800/60">
      <div className="text-sm text-slate-500">
        <span className="text-slate-400 font-medium">{((page - 1) * itemsPerPage) + 1}–{Math.min(page * itemsPerPage, total)}</span>
        {' '}of{' '}
        <span className="text-slate-400 font-medium">{total}</span>
        {' '}events
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage(1)}
          disabled={page === 1}
          className="btn-ghost text-xs disabled:opacity-30 disabled:cursor-not-allowed"
        >
          First
        </button>
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="btn-secondary text-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <div className="flex items-center gap-1 px-2">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (page <= 3) {
              pageNum = i + 1;
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = page - 2 + i;
            }
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`w-9 h-9 text-sm rounded-lg font-medium transition-all duration-150 ${
                  page === pageNum
                    ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="btn-secondary text-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next
        </button>
        <button
          onClick={() => setPage(totalPages)}
          disabled={page === totalPages}
          className="btn-ghost text-xs disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Last
        </button>
      </div>
    </div>
  );
}
