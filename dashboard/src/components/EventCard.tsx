'use client';

import { useState } from 'react';
import { TierBadge } from './TierBadge';
import { CompetitorBadge } from './CompetitorBadge';

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

const borderClasses: Record<string, string> = {
  Critical: 'border-l-critical glow-critical',
  High: 'border-l-high glow-high',
  Medium: 'border-l-medium',
  Low: 'border-l-low',
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function ThreatDots({ level }: { level: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3].map(i => (
        <span 
          key={i} 
          className={`w-1.5 h-1.5 rounded-full ${i <= level ? 'bg-red-400' : 'bg-slate-700'}`} 
        />
      ))}
    </span>
  );
}

export function EventCard({ event }: { event: Event }) {
  const [expanded, setExpanded] = useState(false);
  const accentColor = COMPETITOR_COLORS[event.competitor] || '#94a3b8';

  return (
    <div 
      className={`bg-slate-800/40 border border-slate-700/40 rounded-lg card-hover cursor-pointer ${borderClasses[event.priority_tier] || ''}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4">
        {/* Top row: badges and date */}
        <div className="flex items-center gap-2 mb-2.5">
          <TierBadge tier={event.priority_tier} />
          <CompetitorBadge competitor={event.competitor} />
          <span className="text-[11px] text-slate-500 bg-slate-700/40 px-2 py-0.5 rounded-md">{event.theme}</span>
          <span className="ml-auto text-[11px] text-slate-500 tabular-nums shrink-0">
            {formatDate(event.published_at)}
          </span>
        </div>
        
        {/* Title */}
        <h3 className="text-[15px] font-medium text-slate-100 leading-snug mb-1.5 line-clamp-2">
          {event.title}
        </h3>
        
        {/* Key takeaway */}
        {event.key_takeaway && (
          <p className="text-[13px] text-slate-400 leading-relaxed line-clamp-2">{event.key_takeaway}</p>
        )}

        {/* Expand indicator */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              Threat <ThreatDots level={event.threat_level} />
            </span>
            <span>Score: {event.priority_score?.toFixed(1)}</span>
          </div>
          <span className={`text-[11px] text-slate-500 transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="expand-content px-4 pb-4 pt-0">
          <div className="pt-3 border-t border-slate-700/40 space-y-3">
            {event.summary && (
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Summary</span>
                <p className="text-[13px] text-slate-300 mt-1 leading-relaxed">{event.summary}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]">
              <span className="text-slate-500">Route: <span className="text-slate-300 font-medium">{event.route_to}</span></span>
              <span className="text-slate-500">Threat: <span className="text-slate-300 font-medium">{event.threat_level}/3</span></span>
              <span className="text-slate-500">Relevance: <span className="text-slate-300 font-medium">{event.strategic_relevance}/3</span></span>
              <span className="text-slate-500">Score: <span className="text-slate-300 font-medium">{event.priority_score?.toFixed(1)}</span></span>
            </div>
            <a 
              href={event.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[12px] text-blue-400 hover:text-blue-300 font-medium transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              View Source
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
