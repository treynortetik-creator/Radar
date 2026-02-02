'use client';

import { useState, useEffect, useCallback } from 'react';
import { EventCard } from '@/components/EventCard';
import { CompetitorPill } from '@/components/CompetitorBadge';

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
}

const TIERS = ['Critical', 'High', 'Medium', 'Low'];
const THEMES = [
  'Product/Feature', 'Customer Win', 'Partnership/Integration',
  'Funding/Corporate', 'Competitive Attack', 'Pricing/Packaging',
  'Event/Conference', 'Thought Leadership', 'Job Posting'
];

function StatCard({ 
  label, 
  value, 
  color = 'slate', 
  subtext,
  icon,
}: { 
  label: string; 
  value: number | string; 
  color?: string; 
  subtext?: string;
  icon?: string;
}) {
  const colorMap: Record<string, { bg: string; border: string; text: string; label: string }> = {
    slate: { bg: 'bg-slate-800/60', border: 'border-slate-700/40', text: 'text-slate-100', label: 'text-slate-500' },
    red: { bg: 'bg-red-500/5', border: 'border-red-500/20', text: 'text-red-400', label: 'text-red-400/60' },
    orange: { bg: 'bg-orange-500/5', border: 'border-orange-500/20', text: 'text-orange-400', label: 'text-orange-400/60' },
    yellow: { bg: 'bg-yellow-500/5', border: 'border-yellow-500/20', text: 'text-yellow-400', label: 'text-yellow-400/60' },
    green: { bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', text: 'text-emerald-400', label: 'text-emerald-400/60' },
  };
  const c = colorMap[color] || colorMap.slate;
  
  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-4 relative overflow-hidden`}>
      {icon && <span className="absolute top-3 right-3 text-lg opacity-40">{icon}</span>}
      <div className={`text-3xl font-bold ${c.text} tracking-tight`}>{value}</div>
      <div className={`text-xs font-medium ${c.label} mt-1`}>{label}</div>
      {subtext && <div className="text-[10px] text-slate-600 mt-0.5">{subtext}</div>}
    </div>
  );
}

function SectionHeader({ 
  label, 
  count, 
  color, 
  collapsed, 
  onToggle 
}: { 
  label: string; 
  count: number; 
  color: string; 
  collapsed: boolean; 
  onToggle: () => void;
}) {
  const colorClasses: Record<string, string> = {
    red: 'text-red-400 border-red-500/30',
    orange: 'text-orange-400 border-orange-500/30',
    yellow: 'text-yellow-400 border-yellow-500/30',
    green: 'text-emerald-400 border-emerald-500/30',
  };
  const c = colorClasses[color] || 'text-slate-400 border-slate-600';
  
  return (
    <button 
      onClick={onToggle}
      className={`flex items-center gap-3 w-full py-2 border-b ${c} mb-4 group`}
    >
      <span className={`text-xs font-semibold uppercase tracking-wider ${c.split(' ')[0]}`}>
        {label}
      </span>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-slate-800 ${c.split(' ')[0]}`}>
        {count}
      </span>
      <span className={`ml-auto text-xs text-slate-500 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}>
        ▾
      </span>
    </button>
  );
}

export default function Dashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [competitors, setCompetitors] = useState<CompetitorSummary[]>([]);
  
  // Filters
  const [search, setSearch] = useState('');
  const [competitor, setCompetitor] = useState('');
  const [tier, setTier] = useState('');
  const [theme, setTheme] = useState('');
  
  // Section collapse state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (competitor) params.set('competitor', competitor);
    if (tier) params.set('tier', tier);
    if (theme) params.set('theme', theme);
    params.set('limit', '200');
    
    const res = await fetch(`/api/events?${params}`);
    const data = await res.json();
    setEvents(data.events);
    setTotal(data.total);
    setLoading(false);
  }, [search, competitor, tier, theme]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetch('/api/competitors')
      .then(r => r.json())
      .then(setCompetitors);
  }, []);

  const critical = events.filter(e => e.priority_tier === 'Critical');
  const high = events.filter(e => e.priority_tier === 'High');
  const medium = events.filter(e => e.priority_tier === 'Medium');
  const low = events.filter(e => e.priority_tier === 'Low');

  const handleCompetitorClick = (name: string) => {
    setCompetitor(prev => prev === name ? '' : name);
  };

  const hasActiveFilters = search || competitor || tier || theme;

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Total Events" value={total} icon="📡" />
        <StatCard label="Critical" value={critical.length} color="red" icon="🔴" />
        <StatCard label="High" value={high.length} color="orange" icon="🟠" />
        <StatCard label="Medium" value={medium.length} color="yellow" icon="🟡" />
        <StatCard label="Low" value={low.length} color="green" icon="🟢" />
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
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700/40 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500/30 transition-all"
          />
        </div>
        <select 
          value={tier} 
          onChange={(e) => setTier(e.target.value)}
          className="bg-slate-800/60 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-slate-500"
        >
          <option value="">All Tiers</option>
          {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select 
          value={theme} 
          onChange={(e) => setTheme(e.target.value)}
          className="bg-slate-800/60 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-slate-500"
        >
          <option value="">All Themes</option>
          {THEMES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {hasActiveFilters && (
          <button
            onClick={() => { setSearch(''); setCompetitor(''); setTier(''); setTheme(''); }}
            className="text-xs text-slate-400 hover:text-slate-200 px-2 py-2 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Events */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <div className="w-5 h-5 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
          <span className="text-sm text-slate-500">Loading events...</span>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">🔍</div>
          <div className="text-slate-400 font-medium">No events found</div>
          <div className="text-sm text-slate-500 mt-1">Try adjusting your filters</div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Critical */}
          {critical.length > 0 && (
            <section>
              <SectionHeader 
                label="Critical Priority" 
                count={critical.length} 
                color="red" 
                collapsed={!!collapsedSections.critical}
                onToggle={() => toggleSection('critical')}
              />
              {!collapsedSections.critical && (
                <div className="space-y-2">
                  {critical.map(e => <EventCard key={e.id} event={e} />)}
                </div>
              )}
            </section>
          )}

          {/* High */}
          {high.length > 0 && (
            <section>
              <SectionHeader 
                label="High Priority" 
                count={high.length} 
                color="orange" 
                collapsed={!!collapsedSections.high}
                onToggle={() => toggleSection('high')}
              />
              {!collapsedSections.high && (
                <div className="space-y-2">
                  {high.map(e => <EventCard key={e.id} event={e} />)}
                </div>
              )}
            </section>
          )}

          {/* Medium */}
          {medium.length > 0 && (
            <section>
              <SectionHeader 
                label="Medium Priority" 
                count={medium.length} 
                color="yellow" 
                collapsed={!!collapsedSections.medium}
                onToggle={() => toggleSection('medium')}
              />
              {!collapsedSections.medium && (
                <div className="space-y-2">
                  {medium.map(e => <EventCard key={e.id} event={e} />)}
                </div>
              )}
            </section>
          )}

          {/* Low */}
          {low.length > 0 && (
            <section>
              <SectionHeader 
                label="Low Priority" 
                count={low.length} 
                color="green" 
                collapsed={!!collapsedSections.low}
                onToggle={() => toggleSection('low')}
              />
              {!collapsedSections.low && (
                <div className="space-y-2">
                  {low.map(e => <EventCard key={e.id} event={e} />)}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
