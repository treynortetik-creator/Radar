'use client';

import { useState, useEffect, use } from 'react';
import { EventCard } from '@/components/EventCard';
import { TierBadge } from '@/components/TierBadge';
import Link from 'next/link';

interface CompetitorData {
  competitor: string;
  total_events: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  latest_event: string;
  avg_priority: number;
}

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
  'inspiren': '#CC4125',
  'sage': '#B4A7D6',
  'virtusense': '#9900FF',
  'amba': '#FF9900',
  'nobi': '#B7E1CD',
  'carepredict': '#F9CB9C',
};

const COMPETITOR_NAMES: Record<string, string> = {
  'inspiren': 'Inspiren',
  'sage': 'Sage',
  'virtusense': 'VirtuSense',
  'amba': 'Amba',
  'nobi': 'Nobi',
  'carepredict': 'CarePredict',
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function CompetitorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const competitorName = COMPETITOR_NAMES[slug] || slug;
  const color = COMPETITOR_COLORS[slug] || '#94a3b8';
  
  const [info, setInfo] = useState<CompetitorData | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTier, setFilterTier] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/competitors').then(r => r.json()),
      fetch(`/api/events?competitor=${competitorName}&limit=200`).then(r => r.json()),
    ]).then(([competitors, eventsData]) => {
      const comp = competitors.find((c: CompetitorData) => c.competitor === competitorName);
      setInfo(comp || null);
      setEvents(eventsData.events);
      setLoading(false);
    });
  }, [competitorName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <div className="w-5 h-5 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
        <span className="text-sm text-slate-500">Loading competitor profile...</span>
      </div>
    );
  }
  if (!info) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-3">🔍</div>
        <div className="text-slate-400 font-medium">Competitor not found</div>
        <Link href="/" className="text-sm text-blue-400 hover:text-blue-300 mt-2 inline-block">← Back to Dashboard</Link>
      </div>
    );
  }

  const tiers = [
    { name: 'Critical', count: info.critical_count, color: '#ef4444' },
    { name: 'High', count: info.high_count, color: '#f97316' },
    { name: 'Medium', count: info.medium_count, color: '#eab308' },
    { name: 'Low', count: info.low_count, color: '#22c55e' },
  ];

  const threatRate = Math.round(((info.critical_count + info.high_count) / info.total_events) * 100);
  const filteredEvents = filterTier ? events.filter(e => e.priority_tier === filterTier) : events;

  // Get theme distribution
  const themeMap = new Map<string, number>();
  events.forEach(e => {
    themeMap.set(e.theme, (themeMap.get(e.theme) || 0) + 1);
  });
  const themes = Array.from(themeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // Get key takeaways from critical/high events
  const keyTakeaways = events
    .filter(e => (e.priority_tier === 'Critical' || e.priority_tier === 'High') && e.key_takeaway)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-300 transition-colors">Dashboard</Link>
        <span>/</span>
        <span className="text-slate-300">{competitorName}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shadow-lg" 
          style={{ backgroundColor: `${color}20`, color: color, boxShadow: `0 4px 20px -5px ${color}30` }}
        >
          {competitorName[0]}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{competitorName}</h1>
          <p className="text-sm text-slate-500">{info.total_events} events tracked · Last activity: {formatDate(info.latest_event)}</p>
        </div>
      </div>

      {/* Threat Distribution */}
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">Threat Distribution</h2>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {tiers.map(t => (
            <button 
              key={t.name} 
              onClick={() => setFilterTier(prev => prev === t.name ? '' : t.name)}
              className={`text-center p-3 rounded-lg border transition-all ${
                filterTier === t.name 
                  ? 'ring-1 ring-offset-1 ring-offset-slate-900' 
                  : 'border-slate-700/40 hover:border-slate-600'
              }`}
              style={filterTier === t.name ? { borderColor: t.color, ringColor: t.color } : {}}
            >
              <div className="text-2xl font-bold tabular-nums" style={{ color: t.color }}>{t.count}</div>
              <TierBadge tier={t.name} size="xs" />
            </button>
          ))}
        </div>
        {/* Progress bar */}
        <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-700/30">
          {tiers.filter(t => t.count > 0).map(t => (
            <div 
              key={t.name}
              className="transition-all duration-500 first:rounded-l-full last:rounded-r-full"
              style={{ 
                backgroundColor: t.color, 
                width: `${(t.count / info.total_events) * 100}%`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Stats + Key Takeaways Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">Quick Stats</h2>
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 space-y-4">
            <div>
              <div className="text-xs text-slate-500 mb-1">Avg Priority Score</div>
              <div className="text-xl font-bold text-slate-200 tabular-nums">{info.avg_priority?.toFixed(1)}</div>
            </div>
            <div className="border-t border-slate-700/40 pt-4">
              <div className="text-xs text-slate-500 mb-1">High+ Threat Rate</div>
              <div className="text-xl font-bold tabular-nums" style={{ color: threatRate > 50 ? '#ef4444' : threatRate > 30 ? '#f97316' : '#22c55e' }}>
                {threatRate}%
              </div>
            </div>
            <div className="border-t border-slate-700/40 pt-4">
              <div className="text-xs text-slate-500 mb-2">Top Themes</div>
              <div className="space-y-2">
                {themes.map(([theme, count]) => (
                  <div key={theme} className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 truncate mr-2">{theme}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full" 
                          style={{ width: `${(count / info.total_events) * 100}%`, backgroundColor: color }} 
                        />
                      </div>
                      <span className="text-xs text-slate-500 tabular-nums w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Key Takeaways */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">Key Intelligence</h2>
          {keyTakeaways.length > 0 ? (
            <div className="space-y-2">
              {keyTakeaways.map((event, i) => (
                <div key={event.id} className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TierBadge tier={event.priority_tier} size="xs" />
                    <span className="text-[11px] text-slate-500">{formatDate(event.published_at)}</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{event.key_takeaway}</p>
                  <p className="text-xs text-slate-500 mt-2 truncate">{event.title}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-8 text-center">
              <p className="text-sm text-slate-500">No high-priority takeaways yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Events Timeline */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-200">
            {filterTier ? `${filterTier} Events` : 'All Events'}
            <span className="ml-2 text-xs font-normal text-slate-500">({filteredEvents.length})</span>
          </h2>
          {filterTier && (
            <button 
              onClick={() => setFilterTier('')}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Show all
            </button>
          )}
        </div>
        <div className="space-y-2">
          {filteredEvents.map(e => <EventCard key={e.id} event={e} />)}
        </div>
      </section>
    </div>
  );
}
