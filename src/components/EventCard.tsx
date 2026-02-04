'use client';

import { useState } from 'react';
import { TierBadge, ThreatBar } from './TierBadge';
import { CompetitorBadge } from './CompetitorBadge';
import { ExternalLinkIcon, ChevronIcon, ClockIcon, TargetIcon, SignalIcon } from './icons';

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

const COMPETITOR_COLORS: Record<string, string> = {
  'Inspiren': '#CC4125',
  'Sage': '#B4A7D6',
  'VirtuSense': '#9900FF',
  'Amba': '#FF9900',
  'Nobi': '#B7E1CD',
  'CarePredict': '#F9CB9C',
};

const cardClasses: Record<string, string> = {
  Critical: 'border-l-critical glow-critical',
  High: 'border-l-high glow-high',
  Medium: 'border-l-medium',
  Low: 'border-l-low',
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatFullDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// Theme badge styling
const themeColors: Record<string, { bg: string; text: string; border: string }> = {
  'Product/Feature': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  'Customer Win': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  'Partnership/Integration': { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  'Funding/Corporate': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  'Competitive Attack': { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  'Pricing/Packaging': { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  'Event/Conference': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  'Thought Leadership': { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  'Job Posting': { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
};

function ThemeBadge({ theme }: { theme: string }) {
  const colors = themeColors[theme] || { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${colors.bg} ${colors.text} ${colors.border}`}>
      {theme}
    </span>
  );
}

export function EventCard({ event }: { event: Event }) {
  const [expanded, setExpanded] = useState(false);
  const accentColor = COMPETITOR_COLORS[event.competitor] || '#94a3b8';

  return (
    <div 
      className={`
        card-base cursor-pointer group
        ${cardClasses[event.priority_tier] || ''}
      `}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4">
        {/* Top row: badges and date */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <TierBadge tier={event.priority_tier} size="sm" />
          <CompetitorBadge competitor={event.competitor} size="sm" />
          <ThemeBadge theme={event.theme} />
          
          <div className="flex items-center gap-1.5 ml-auto text-slate-500">
            <ClockIcon className="w-3 h-3" />
            <span className="text-[11px] tabular-nums shrink-0">
              {formatDate(event.published_at)}
            </span>
          </div>
        </div>
        
        {/* Title */}
        <h3 className="text-[15px] font-semibold text-slate-100 leading-snug mb-2 line-clamp-2 group-hover:text-white transition-colors">
          {event.title}
        </h3>
        
        {/* Key takeaway */}
        {event.key_takeaway && (
          <p className="text-[13px] text-slate-400 leading-relaxed line-clamp-2 mb-3">
            {event.key_takeaway}
          </p>
        )}

        {/* Bottom row: metrics */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            {/* Threat level */}
            <div className="flex items-center gap-1.5">
              <span className="uppercase tracking-wider font-medium">Threat</span>
              <ThreatBar level={event.threat_level} max={3} />
            </div>
            
            {/* Priority score */}
            <div className="flex items-center gap-1.5">
              <SignalIcon strength={Math.ceil(event.priority_score / 25)} className="w-3.5 h-3.5 text-slate-600" />
              <span className="font-mono font-medium text-slate-400">{event.priority_score?.toFixed(1)}</span>
            </div>
          </div>
          
          {/* Expand indicator */}
          <div 
            className={`
              flex items-center gap-1 text-[11px] text-slate-500 
              transition-all duration-200 group-hover:text-slate-400
            `}
          >
            <span className="hidden sm:inline">{expanded ? 'Less' : 'More'}</span>
            <ChevronIcon 
              direction={expanded ? 'up' : 'down'} 
              className="w-4 h-4 transition-transform duration-200" 
            />
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="expand-content px-4 pb-4">
          <div className="pt-4 border-t border-slate-700/40 space-y-4">
            {/* Summary */}
            {event.summary && (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Intel Summary</span>
                </div>
                <p className="text-[13px] text-slate-300 leading-relaxed">{event.summary}</p>
              </div>
            )}
            
            {/* Metrics grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricItem label="Route To" value={event.route_to} />
              <MetricItem label="Threat Level" value={`${event.threat_level}/3`} />
              <MetricItem label="Relevance" value={`${event.strategic_relevance}/3`} />
              <MetricItem label="Published" value={formatFullDate(event.published_at)} />
            </div>
            
            {/* Source link */}
            <a 
              href={event.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="
                inline-flex items-center gap-2 px-3 py-2 rounded-lg
                text-[12px] font-medium text-amber-400 
                bg-amber-500/10 border border-amber-500/20
                hover:bg-amber-500/15 hover:border-amber-500/30
                transition-all duration-150
              "
              onClick={(e) => e.stopPropagation()}
            >
              <span>View Source</span>
              <ExternalLinkIcon className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900/40 rounded-lg px-3 py-2">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-0.5">{label}</div>
      <div className="text-xs text-slate-300 font-medium">{value}</div>
    </div>
  );
}

// Compact event card for lists
export function EventCardCompact({ event }: { event: Event }) {
  return (
    <a 
      href={event.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        flex items-start gap-3 p-3 rounded-lg
        bg-slate-800/30 border border-slate-700/30
        hover:bg-slate-800/50 hover:border-slate-700/50
        transition-all duration-150
        ${cardClasses[event.priority_tier] || ''}
      `}
    >
      <TierBadge tier={event.priority_tier} size="xs" />
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-slate-200 line-clamp-1">{event.title}</h4>
        <div className="flex items-center gap-2 mt-1">
          <CompetitorBadge competitor={event.competitor} size="xs" showDot={false} />
          <span className="text-[10px] text-slate-500">{formatDate(event.published_at)}</span>
        </div>
      </div>
      <ExternalLinkIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
    </a>
  );
}
