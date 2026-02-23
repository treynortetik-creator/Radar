'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { FilterIcon, LoadingRadar, SearchIcon, TargetIcon, ExternalLinkIcon } from '@/components/icons';

interface IndustryNewsItem {
  id: number;
  title: string;
  url: string;
  summary: string | null;
  published_at: string | null;
  source_name: string;
  relevance_tier: 'Major' | 'Notable' | 'Background' | null;
  relevance_summary: string | null;
  is_read: boolean;
}

const SOURCE_OPTIONS = [
  "McKnight's Senior Living",
  'Senior Housing News',
  'LeadingAge',
  'Argentum',
  "McKnight's LTC News",
];

const TIER_OPTIONS = ['Major', 'Notable', 'Background'] as const;
const PAGE_SIZE = 25;

function tierClasses(tier: string | null): string {
  if (tier === 'Major') return 'badge-critical';
  if (tier === 'Notable') return 'badge-high';
  return 'badge-low';
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'amber' | 'critical' | 'high' | 'low';
}) {
  const toneClass: Record<string, string> = {
    amber: 'text-amber-400',
    critical: 'text-red-400',
    high: 'text-orange-400',
    low: 'text-emerald-400',
  };

  return (
    <div className="stat-card">
      <div className={`stat-value ${toneClass[tone]}`}>{value}</div>
      <div className="stat-label text-slate-500">{label}</div>
    </div>
  );
}

function IndustryPageContent() {
  const [records, setRecords] = useState<IndustryNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState({ total: 0, major: 0, notable: 0, background: 0 });

  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');
  const [tier, setTier] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const baseParams = useMemo(() => {
    const params = new URLSearchParams();
    if (source) params.set('source', source);
    if (tier) params.set('tier', tier);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    return params;
  }, [source, tier, dateFrom, dateTo]);

  const fetchCount = useCallback(async (tierValue?: string): Promise<number> => {
    const params = new URLSearchParams(baseParams.toString());
    if (tierValue) params.set('tier', tierValue);
    else params.delete('tier');
    params.set('limit', '1');
    params.set('offset', '0');
    const res = await fetch(`/api/industry?${params}`);
    const data = (await res.json()) as { total?: number };
    return data.total || 0;
  }, [baseParams]);

  const loadStats = useCallback(async () => {
    const [allCount, major, notable, background] = await Promise.all([
      fetchCount(),
      fetchCount('Major'),
      fetchCount('Notable'),
      fetchCount('Background'),
    ]);
    setStats({ total: allCount, major, notable, background });
  }, [fetchCount]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(baseParams.toString());
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String((page - 1) * PAGE_SIZE));

      const res = await fetch(`/api/industry?${params}`);
      const data = (await res.json()) as { records?: IndustryNewsItem[]; total?: number };
      let nextRecords = data.records || [];

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        nextRecords = nextRecords.filter((item) =>
          item.title.toLowerCase().includes(q) ||
          (item.relevance_summary || '').toLowerCase().includes(q) ||
          (item.summary || '').toLowerCase().includes(q),
        );
      }

      setRecords(nextRecords);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to load industry news:', error);
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [baseParams, page, search]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    setPage(1);
  }, [source, tier, dateFrom, dateTo, search]);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/25 flex items-center justify-center">
          <TargetIcon className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Industry News</h1>
          <p className="text-sm text-slate-500">Sector intelligence stream for senior living market context</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} tone="amber" />
        <StatCard label="Major" value={stats.major} tone="critical" />
        <StatCard label="Notable" value={stats.notable} tone="high" />
        <StatCard label="Background" value={stats.background} tone="low" />
      </div>

      <div className="card-base p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-base pl-10"
              placeholder="Search current page..."
            />
          </div>

          <div className="flex items-center gap-2">
            <FilterIcon className="w-4 h-4 text-slate-500" />
            <select value={source} onChange={(e) => setSource(e.target.value)} className="input-base py-2 min-w-[190px]">
              <option value="">All Sources</option>
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>

            <select value={tier} onChange={(e) => setTier(e.target.value)} className="input-base py-2 min-w-[130px]">
              <option value="">All Tiers</option>
              {TIER_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-base py-2 w-[180px]" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-base py-2 w-[180px]" />
          <button
            onClick={() => {
              setSearch('');
              setSource('');
              setTier('');
              setDateFrom('');
              setDateTo('');
            }}
            className="btn-ghost text-xs"
          >
            Clear filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <LoadingRadar className="w-16 h-16 text-cyan-400" />
          <span className="text-sm text-slate-500 font-medium">Scanning sector intel feeds...</span>
        </div>
      ) : records.length === 0 ? (
        <div className="card-base p-12 text-center">
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No industry items found</h3>
          <p className="text-sm text-slate-500">Adjust filters or run `ingest_industry.py` to populate this feed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((item, idx) => (
            <article key={item.id} className={`card-base p-5 border-l-4 border-l-cyan-500/30 animate-fade-in stagger-${Math.min(idx + 1, 5)}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-[11px] uppercase tracking-wide text-cyan-300 font-semibold">
                      {item.source_name}
                    </span>
                    <span className={`badge-base ${tierClasses(item.relevance_tier)}`}>
                      {item.relevance_tier || 'Background'}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-semibold text-slate-100 leading-snug">{item.title}</h2>
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-icon shrink-0"
                  aria-label="Open article"
                >
                  <ExternalLinkIcon className="w-4 h-4" />
                </a>
              </div>
              <p className="text-sm text-slate-400 mb-3">{item.relevance_summary || item.summary || 'No summary available.'}</p>
              <p className="text-xs text-slate-500">
                Published {item.published_at ? new Date(item.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}
              </p>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-slate-500">
            Page <span className="text-slate-300">{page}</span> of <span className="text-slate-300">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary text-sm disabled:opacity-30">
              Previous
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-secondary text-sm disabled:opacity-30">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IndustryPage() {
  return (
    <AuthGuard>
      <IndustryPageContent />
    </AuthGuard>
  );
}
