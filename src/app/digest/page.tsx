'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { DocumentIcon, LoadingRadar } from '@/components/icons';
import type { WeeklyDigest } from '@/lib/db';

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const yearOpts: Intl.DateTimeFormatOptions = { ...opts, year: 'numeric' };
  return `${s.toLocaleDateString('en-US', opts)} — ${e.toLocaleDateString('en-US', yearOpts)}`;
}

const statusStyles: Record<string, { bg: string; text: string }> = {
  generated: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  delivered: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  archived: { bg: 'bg-slate-500/10', text: 'text-slate-400' },
};

const typeStyles: Record<string, { bg: string; text: string }> = {
  weekly: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  monthly: { bg: 'bg-violet-500/10', text: 'text-violet-400' },
  '90day': { bg: 'bg-teal-500/10', text: 'text-teal-400' },
  '180day': { bg: 'bg-rose-500/10', text: 'text-rose-400' },
};

type FilterType = 'all' | 'weekly' | 'monthly' | '90day' | '180day';

function DigestListPage() {
  const [digests, setDigests] = useState<WeeklyDigest[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    loadDigests();
  }, [filter]);

  const loadDigests = async () => {
    setLoading(true);
    try {
      const typeParam = filter !== 'all' ? `&type=${filter}` : '';
      const res = await fetch(`/api/digest?limit=50${typeParam}`);
      const data = await res.json();
      setDigests(data.digests || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load digests:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
          <DocumentIcon className="w-5 h-5 text-slate-900" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Intel Digests</h1>
          <p className="text-sm text-slate-500">{total} digest{total !== 1 ? 's' : ''} generated</p>
        </div>
      </div>

      {/* Filter Toggle */}
      <div className="flex flex-wrap gap-1 bg-slate-900/60 border border-slate-700/40 rounded-lg p-1 w-fit mb-6">
        {([
          { key: 'all', label: 'All' },
          { key: 'weekly', label: 'Weekly' },
          { key: 'monthly', label: 'Monthly' },
          { key: '90day', label: '90-Day' },
          { key: '180day', label: '180-Day' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
              filter === key
                ? 'bg-slate-800 text-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <LoadingRadar />
        </div>
      ) : digests.length === 0 ? (
        <div className="card-base p-12 text-center">
          <DocumentIcon className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No Digests Yet</h3>
          <p className="text-sm text-slate-500 mb-4">
            Generate your first intel digest from the{' '}
            <Link href="/admin" className="text-amber-400 hover:text-amber-300 underline">
              Control Panel
            </Link>.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {digests.map((digest) => {
            const style = statusStyles[digest.status] || statusStyles.generated;
            const tStyle = typeStyles[digest.digest_type] || typeStyles.weekly;
            const snippet = digest.summary
              ? digest.summary.replace(/^#.*\n*/gm, '').trim().slice(0, 200)
              : digest.content.slice(0, 200);

            return (
              <Link
                key={digest.id}
                href={`/digest/${digest.id}`}
                className="card-base p-5 block transition-all duration-150 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-semibold text-slate-200 group-hover:text-amber-400 transition-colors">
                        {formatDateRange(digest.week_start, digest.week_end)}
                      </h3>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${tStyle.bg} ${tStyle.text}`}>
                        {{ weekly: 'Weekly', monthly: 'Monthly', '90day': '90-Day', '180day': '180-Day' }[digest.digest_type] || 'Weekly'}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${style.bg} ${style.text}`}>
                        {digest.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 line-clamp-2 mb-3">
                      {snippet}...
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>{digest.event_count || 0} events analyzed</span>
                      {digest.model_used && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{digest.model_used.split('/').pop()}</span>
                        </>
                      )}
                      {digest.competitor_breakdown && (
                        <>
                          <span>•</span>
                          <span>{Object.keys(digest.competitor_breakdown).length} competitors</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-slate-600 group-hover:text-slate-400 transition-colors mt-1">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DigestPage() {
  return (
    <AuthGuard>
      <DigestListPage />
    </AuthGuard>
  );
}
