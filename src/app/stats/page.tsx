'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COMPETITOR_COLORS: Record<string, string> = {
  'Inspiren': '#CC4125',
  'Sage': '#B4A7D6',
  'VirtuSense': '#9900FF',
  'Amba': '#FF9900',
  'Nobi': '#B7E1CD',
  'CarePredict': '#F9CB9C',
};

const TIER_COLORS: Record<string, string> = {
  'Critical': '#ef4444',
  'High': '#f97316',
  'Medium': '#eab308',
  'Low': '#22c55e',
};

const TIER_ORDER = ['Critical', 'High', 'Medium', 'Low'];

interface StatsData {
  tierDistribution: { priority_tier: string; count: number }[];
  themeDistribution: { theme: string; count: number }[];
  competitorActivity: { competitor: string; count: number }[];
  routeDistribution: { route_to: string; count: number }[];
  timeline: { date: string; competitor: string; count: number }[];
  totalEvents: number;
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function MiniStatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className={`rounded-xl p-4 border`} style={{ 
      backgroundColor: `${color}08`, 
      borderColor: `${color}25` 
    }}>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color || entry.fill }}>
          {entry.name || entry.dataKey}: {entry.value}
        </p>
      ))}
    </div>
  );
};

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats);
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <div className="w-5 h-5 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
        <span className="text-sm text-slate-500">Loading analytics...</span>
      </div>
    );
  }

  // Sort tiers in order
  const sortedTiers = [...stats.tierDistribution].sort(
    (a, b) => TIER_ORDER.indexOf(a.priority_tier) - TIER_ORDER.indexOf(b.priority_tier)
  );

  // Calculate high-threat percentage
  const criticalHigh = sortedTiers
    .filter(t => t.priority_tier === 'Critical' || t.priority_tier === 'High')
    .reduce((sum, t) => sum + t.count, 0);
  const threatRate = stats.totalEvents > 0 ? Math.round((criticalHigh / stats.totalEvents) * 100) : 0;

  // Most active competitor
  const topCompetitor = stats.competitorActivity[0];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Intelligence overview and competitive landscape</p>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStatCard label="Total Events" value={stats.totalEvents} color="#6366f1" />
        <MiniStatCard label="High+ Threats" value={criticalHigh} color="#ef4444" />
        <MiniStatCard label="Threat Rate" value={`${threatRate}%`} color="#f97316" />
        <MiniStatCard label="Top Competitor" value={topCompetitor?.competitor || '—'} color={COMPETITOR_COLORS[topCompetitor?.competitor] || '#94a3b8'} />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Competitor Activity */}
        <ChartCard title="Events by Competitor" subtitle="Total tracked events per competitor">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.competitorActivity} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="competitor" type="category" width={85} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24}>
                {stats.competitorActivity.map((entry) => (
                  <Cell key={entry.competitor} fill={COMPETITOR_COLORS[entry.competitor] || '#64748b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Priority Distribution */}
        <ChartCard title="Priority Distribution" subtitle="Breakdown by threat level">
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="55%" height={280}>
              <PieChart>
                <Pie
                  data={sortedTiers}
                  dataKey="count"
                  nameKey="priority_tier"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  strokeWidth={2}
                  stroke="#0b1120"
                >
                  {sortedTiers.map((entry) => (
                    <Cell key={entry.priority_tier} fill={TIER_COLORS[entry.priority_tier] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {sortedTiers.map(t => {
                const pct = Math.round((t.count / stats.totalEvents) * 100);
                return (
                  <div key={t.priority_tier}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium" style={{ color: TIER_COLORS[t.priority_tier] }}>
                        {t.priority_tier}
                      </span>
                      <span className="text-xs text-slate-400 tabular-nums">{t.count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${pct}%`, 
                          backgroundColor: TIER_COLORS[t.priority_tier] 
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ChartCard>

        {/* Theme Distribution */}
        <ChartCard title="Events by Theme" subtitle="Intelligence categorization">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={stats.themeDistribution} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="theme" type="category" width={140} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }} />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={20}>
                {stats.themeDistribution.map((_, i) => (
                  <Cell key={i} fill={`hsl(${240 + i * 15}, 70%, 60%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Route Distribution */}
        <ChartCard title="Intelligence Routing" subtitle="Where events are sent for action">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={stats.routeDistribution} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="route_to" type="category" width={130} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20}>
                {stats.routeDistribution.map((_, i) => (
                  <Cell key={i} fill={`hsl(${270 + i * 20}, 60%, 55%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
