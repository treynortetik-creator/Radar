'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { ChevronIcon, DocumentIcon, LoadingRadar } from '@/components/icons';
import type { WeeklyDigest } from '@/lib/db';

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
  return `${s.toLocaleDateString('en-US', opts)} - ${e.toLocaleDateString('en-US', opts)}`;
}

function splitDigestSections(content: string): {
  intro: string;
  competitive: string;
  industry: string;
} {
  // Try multiple heading patterns for each section (AI models sometimes rename them)
  const compPatterns = [
    /^##\s+Competitive Intel\b/im,
    /^##\s+Competitive Intelligence\b/im,
    /^##\s+Competitor\b/im,
    /^##\s+7-Day Summary\b/im,
  ];
  const industryPatterns = [
    /^##\s+Industry News\b/im,
    /^##\s+Industry\b/im,
    /^##\s+Industry Analysis\b/im,
    /^##\s+Industry Trends\b/im,
  ];

  let compMatch: RegExpMatchArray | null = null;
  for (const p of compPatterns) {
    compMatch = content.match(p);
    if (compMatch) break;
  }

  let industryMatch: RegExpMatchArray | null = null;
  for (const p of industryPatterns) {
    industryMatch = content.match(p);
    if (industryMatch) break;
  }

  if (!compMatch || !industryMatch || compMatch.index === undefined || industryMatch.index === undefined) {
    // Last resort: if we found competitive but not industry, split at the competitive section
    if (compMatch && compMatch.index !== undefined) {
      return {
        intro: content.slice(0, compMatch.index).trim(),
        competitive: content.slice(compMatch.index).trim(),
        industry: '',
      };
    }
    return { intro: '', competitive: content, industry: '' };
  }

  const compStart = compMatch.index;
  const industryStart = industryMatch.index;

  if (industryStart <= compStart) {
    return { intro: '', competitive: content, industry: '' };
  }

  return {
    intro: content.slice(0, compStart).trim(),
    competitive: content.slice(compStart, industryStart).trim(),
    industry: content.slice(industryStart).trim(),
  };
}

/**
 * Simple markdown to HTML converter - no external dependencies.
 * Handles: headings, bold, italic, links, lists, horizontal rules, code blocks.
 */
function renderMarkdown(md: string): string {
  let html = md
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-slate-900/60 border border-slate-700/40 rounded-lg p-4 overflow-x-auto text-sm font-mono text-slate-300 my-4"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-800 px-1.5 py-0.5 rounded text-amber-400 text-sm font-mono">$1</code>')
    .replace(/^#### (.+)$/gm, '<h4 class="text-base font-semibold text-slate-200 mt-6 mb-2">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-slate-200 mt-8 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-amber-400 mt-10 mb-4 pb-2 border-b border-slate-800">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-slate-100 mt-6 mb-4">$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="font-bold text-slate-200"><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-200">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic text-slate-300">$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-amber-400 hover:text-amber-300 underline underline-offset-2">$1</a>')
    .replace(/^---$/gm, '<hr class="border-slate-800 my-8" />')
    .replace(/^[\-*] (.+)$/gm, '<li class="ml-4 pl-2 text-slate-300 before:content-[\'•\'] before:text-amber-500 before:mr-2">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 pl-2 text-slate-300 list-decimal">$1</li>')
    .replace(/\n\n/g, '</p><p class="text-slate-400 leading-relaxed mb-4">')
    .replace(/\n/g, '<br />');

  html = `<p class="text-slate-400 leading-relaxed mb-4">${html}</p>`;
  html = html.replace(/<p class="[^"]*"><\/p>/g, '');

  return html;
}

function SectionCard({
  title,
  count,
  isOpen,
  onToggle,
  content,
}: {
  title: string;
  count?: number;
  isOpen: boolean;
  onToggle: () => void;
  content: string;
}) {
  return (
    <div className="card-base p-0 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-800/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-sm sm:text-base font-semibold text-slate-100">{title}</h3>
          {typeof count === 'number' && (
            <span className="text-xs px-2 py-1 rounded bg-slate-800/70 border border-slate-700/50 text-slate-300">
              {count}
            </span>
          )}
        </div>
        <ChevronIcon direction={isOpen ? 'up' : 'down'} className="w-4 h-4 text-slate-400" />
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-1 border-t border-slate-800/60">
          <div className="prose-radar" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
        </div>
      )}
    </div>
  );
}

function DigestViewPage() {
  const params = useParams();
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompetitive, setShowCompetitive] = useState(true);
  const [showIndustry, setShowIndustry] = useState(true);

  useEffect(() => {
    if (params.id) void loadDigest(params.id as string);
  }, [params.id]);

  const loadDigest = async (id: string) => {
    try {
      const res = await fetch(`/api/digest/${id}`);
      const data = (await res.json()) as { error?: string; digest?: WeeklyDigest };
      if (data.error) {
        setError(data.error);
      } else {
        setDigest(data.digest || null);
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
            &larr; Back to Digests
          </Link>
        </div>
      </div>
    );
  }

  const competitorBreakdown = digest.competitor_breakdown || {};
  const industryBreakdown = digest.industry_breakdown || {};
  const sortedCompetitors = Object.entries(competitorBreakdown).sort((a, b) => b[1] - a[1]);
  const sortedIndustry = Object.entries(industryBreakdown).sort((a, b) => b[1] - a[1]);

  const sections = splitDigestSections(digest.content);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link
        href="/digest"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Digests
      </Link>

      <div className="card-base p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0">
            <DocumentIcon className="w-6 h-6 text-slate-900" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-100 mb-1">Weekly Intel Digest</h1>
            <p className="text-base text-amber-400 font-medium mb-3">
              {formatDateRange(digest.week_start, digest.week_end)}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span>{digest.event_count || 0} competitor events</span>
              <span>{digest.industry_news_count || 0} industry items (Major/Notable)</span>
              <span>
                Slack: {digest.slack_posted ? 'Posted' : 'Not posted'}
                {digest.slack_ts ? ` (${digest.slack_ts})` : ''}
              </span>
              {digest.model_used && <span className="font-mono">{digest.model_used}</span>}
              <span>
                Generated{' '}
                {new Date(digest.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {digest.slack_error && (
              <p className="text-xs text-red-400 mt-2">Slack error: {digest.slack_error}</p>
            )}
          </div>
        </div>
      </div>

      {(sortedCompetitors.length > 0 || sortedIndustry.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-base p-4">
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

          <div className="card-base p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Industry Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {sortedIndustry.map(([name, count]) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/40 text-sm"
                >
                  <span className="text-slate-300 font-medium">{name}</span>
                  <span className="text-cyan-300 font-mono text-xs">{count}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {sections.intro && (
        <div className="card-base p-5">
          <div className="prose-radar" dangerouslySetInnerHTML={{ __html: renderMarkdown(sections.intro) }} />
        </div>
      )}

      <SectionCard
        title="Competitive Intel"
        count={digest.event_count || 0}
        isOpen={showCompetitive}
        onToggle={() => setShowCompetitive((v) => !v)}
        content={sections.competitive || digest.content}
      />

      <SectionCard
        title="Industry News"
        count={digest.industry_news_count || 0}
        isOpen={showIndustry}
        onToggle={() => setShowIndustry((v) => !v)}
        content={sections.industry || 'No dedicated industry section was generated in this digest.'}
      />
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
