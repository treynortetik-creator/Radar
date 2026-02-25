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
  return `${s.toLocaleDateString('en-US', opts)} - ${e.toLocaleDateString('en-US', yearOpts)}`;
}

const statusStyles: Record<string, { bg: string; text: string }> = {
  generated: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  delivered: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  archived: { bg: 'bg-slate-500/10', text: 'text-slate-400' },
};

function DigestListPage() {
  const [digests, setDigests] = useState<WeeklyDigest[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    void loadDigests();
  }, []);

  const loadDigests = async () => {
    try {
      const res = await fetch('/api/digest?limit=50');
      const data = await res.json() as { digests?: WeeklyDigest[]; total?: number };
      setDigests(data.digests || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load digests:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingRadar />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
          <DocumentIcon className="w-5 h-5 text-slate-900" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Weekly Intel Digests</h1>
          <p className="text-sm text-slate-500">{total} digest{total !== 1 ? 's' : ''} generated</p>
        </div>
      </div>

      {digests.length === 0 ? (
        <div className="card-base p-12 text-center">
          <DocumentIcon className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No Digests Yet</h3>
          <p className="text-sm text-slate-500 mb-4">
            Generate your first weekly intel digest from the{' '}
            <Link href="/admin" className="text-amber-400 hover:text-amber-300 underline">
              Control Panel
            </Link>.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {digests.map((digest) => {
            const style = statusStyles[digest.status] || statusStyles.generated;
            const snippet = digest.summary
              ? digest.summary.replace(/^#.*\n*/gm, '').trim().slice(0, 200)
              : (digest.content || '').slice(0, 200);

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
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${style.bg} ${style.text}`}>
                        {digest.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 line-clamp-2 mb-3">
                      {snippet}...
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>{digest.event_count || 0} competitor events</span>
                      <span>{digest.industry_news_count || 0} industry items</span>
                      {digest.model_used && <span className="font-mono">{digest.model_used.split('/').pop()}</span>}
                      {digest.competitor_breakdown && <span>{Object.keys(digest.competitor_breakdown).length} competitors</span>}
                      {typeof digest.slack_posted === 'boolean' && (
                        <span className={digest.slack_posted ? 'text-emerald-400' : 'text-red-400'}>
                          Slack {digest.slack_posted ? 'posted' : 'failed'}
                        </span>
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
