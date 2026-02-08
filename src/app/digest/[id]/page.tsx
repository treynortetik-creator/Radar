'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { DocumentIcon, LoadingRadar } from '@/components/icons';
import type { WeeklyDigest } from '@/lib/db';

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
  return `${s.toLocaleDateString('en-US', opts)} — ${e.toLocaleDateString('en-US', opts)}`;
}

/**
 * Simple markdown to HTML converter — no external dependencies.
 * Handles: headings, bold, italic, links, lists, horizontal rules, code blocks.
 */
function renderMarkdown(md: string): string {
  let html = md
    // Code blocks (fenced)
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-slate-900/60 border border-slate-700/40 rounded-lg p-4 overflow-x-auto text-sm font-mono text-slate-300 my-4"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-slate-800 px-1.5 py-0.5 rounded text-amber-400 text-sm font-mono">$1</code>')
    // Headings
    .replace(/^#### (.+)$/gm, '<h4 class="text-base font-semibold text-slate-200 mt-6 mb-2">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-slate-200 mt-8 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-amber-400 mt-10 mb-4 pb-2 border-b border-slate-800">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-slate-100 mt-6 mb-4">$1</h1>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="font-bold text-slate-200"><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-200">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic text-slate-300">$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-amber-400 hover:text-amber-300 underline underline-offset-2">$1</a>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="border-slate-800 my-8" />')
    // Unordered lists
    .replace(/^[\-\*] (.+)$/gm, '<li class="ml-4 pl-2 text-slate-300 before:content-[\'•\'] before:text-amber-500 before:mr-2">$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 pl-2 text-slate-300 list-decimal">$1</li>')
    // Paragraphs (double newline)
    .replace(/\n\n/g, '</p><p class="text-slate-400 leading-relaxed mb-4">')
    // Single line breaks
    .replace(/\n/g, '<br />');

  // Wrap in paragraph
  html = `<p class="text-slate-400 leading-relaxed mb-4">${html}</p>`;

  // Clean up empty paragraphs
  html = html.replace(/<p class="[^"]*"><\/p>/g, '');

  return html;
}

function DigestViewPage() {
  const params = useParams();
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) loadDigest(params.id as string);
  }, [params.id]);

  const loadDigest = async (id: string) => {
    try {
      const res = await fetch(`/api/digest/${id}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setDigest(data.digest);
      }
    } catch (err) {
      console.error('Failed to load digest:', err);
      setError('Failed to load digest');
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

  if (error || !digest) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="card-base p-12 text-center">
          <h2 className="text-lg font-semibold text-slate-300 mb-2">Digest Not Found</h2>
          <p className="text-sm text-slate-500 mb-4">{error || 'This digest does not exist.'}</p>
          <Link href="/digest" className="btn-secondary inline-block">
            ← Back to Digests
          </Link>
        </div>
      </div>
    );
  }

  const breakdown = digest.competitor_breakdown || {};
  const sortedCompetitors = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Back link */}
      <Link
        href="/digest"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Digests
      </Link>

      {/* Header */}
      <div className="card-base p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0">
            <DocumentIcon className="w-6 h-6 text-slate-900" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-100 mb-1">
              {digest.digest_type === 'monthly' ? 'Monthly' : 'Weekly'} Intel Digest
            </h1>
            <p className="text-base text-amber-400 font-medium mb-3">
              {formatDateRange(digest.week_start, digest.week_end)}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span>{digest.event_count || 0} events analyzed</span>
              {digest.model_used && (
                <>
                  <span>•</span>
                  <span className="font-mono">{digest.model_used}</span>
                </>
              )}
              {digest.tokens_used && (
                <>
                  <span>•</span>
                  <span>{digest.tokens_used.toLocaleString()} tokens</span>
                </>
              )}
              <span>•</span>
              <span>Generated {new Date(digest.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Competitor Breakdown */}
      {sortedCompetitors.length > 0 && (
        <div className="card-base p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Competitor Breakdown</h3>
          <div className="flex flex-wrap gap-2">
            {sortedCompetitors.map(([name, count]) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/40 text-sm"
              >
                <span className="text-slate-300 font-medium">{name}</span>
                <span className="text-amber-400 font-mono text-xs">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Digest Content */}
      <div className="card-base p-6 sm:p-8">
        <div
          className="prose-radar"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(digest.content) }}
        />
      </div>
    </div>
  );
}

export default function DigestDetailPage() {
  return (
    <AuthGuard>
      <DigestViewPage />
    </AuthGuard>
  );
}
