'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { LoadingRadar, AnalyticsIcon, TargetIcon, ShieldIcon, SignalIcon } from '@/components/icons';

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

function ChartCard({ 
  title, 
  subtitle, 
  children,
  className = '',
}: { 
  title: string; 
  subtitle?: string; 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`card-base p-5 ${className}`}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function MiniStatCard({ 
  label, 
  value, 
  color = '#f59e0b',
  icon: Icon,
}: { 
  label: string; 
  value: number | string; 
  color?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div 
      className="stat-card relative overflow-hidden"
      style={{ 
        background: `linear-gradient(135deg, ${color}08 0%, transparent 100%)`,
        borderColor: `${color}20`,
      }}
    >
      {Icon && (
        <div className="absolute top-3 right-3 opacity-20">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label text-slate-500">{label}</div>
    </div>
  );
}

interface TooltipEntry {
  color?: string;
  fill?: string;
  name?: string;
  dataKey?: string;
  value?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800/95 backdrop-blur border border-slate-700/50 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1.5 font-medium">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold flex items-center gap-2" style={{ color: entry.color || entry.fill }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
          {entry.name || entry.dataKey}: {entry.value}
        </p>
      ))}
    </div>
  );
};

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<StatsData>;
      })
      .then(setStats)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load stats'));
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="text-red-400 text-sm font-medium">Failed to load analytics</div>
        <div className="text-slate-500 text-xs">{error}</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <LoadingRadar className="w-16 h-16 text-amber-500" />
        <span className="text-sm text-slate-500 font-medium">Analyzing intel data...</span>
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
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center">
          <AnalyticsIcon className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Analytics</h1>
          <p className="text-sm text-slate-500">Intelligence overview and competitive landscape</p>
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStatCard label="Total Events" value={stats.totalEvents} color="#6366f1" icon={TargetIcon} />
        <MiniStatCard label="High+ Threats" value={criticalHigh} color="#ef4444" icon={ShieldIcon} />
        <MiniStatCard label="Threat Rate" value={`${threatRate}%`} color="#f97316" icon={SignalIcon} />
        <MiniStatCard 
          label="Top Competitor" 
          value={topCompetitor?.competitor || '—'} 
          color={COMPETITOR_COLORS[topCompetitor?.competitor] || '#94a3b8'} 
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Competitor Activity */}
        <ChartCard title="Events by Competitor" subtitle="Total tracked events per competitor">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.competitorActivity} layout="vertical" margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="competitor" type="category" width={90} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={28}>
                {stats.competitorActivity.map((entry) => (
                  <Cell key={entry.competitor} fill={COMPETITOR_COLORS[entry.competitor] || '#64748b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Priority Distribution */}
        <ChartCard title="Threat Level Distribution" subtitle="Breakdown by priority tier">
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={280}>
              <PieChart>
                <Pie
                  data={sortedTiers}
                  dataKey="count"
                  nameKey="priority_tier"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  strokeWidth={3}
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
                const color = TIER_COLORS[t.priority_tier] || '#64748b';
                return (
                  <div key={t.priority_tier}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs font-semibold" style={{ color }}>
                          {t.priority_tier}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 tabular-nums font-medium">
                        {t.count} <span className="text-slate-500">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-slate-800/60 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ 
                          width: `${pct}%`, 
                          backgroundColor: color,
                          boxShadow: `0 0 10px ${color}40`,
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
            <BarChart data={stats.themeDistribution} layout="vertical" margin={{ left: 20, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="theme" type="category" width={140} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={22}>
                {stats.themeDistribution.map((_, i) => (
                  <Cell key={i} fill={`hsl(${220 + i * 20}, 70%, 55%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Route Distribution */}
        <ChartCard title="Intelligence Routing" subtitle="Distribution by action required">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={stats.routeDistribution} layout="vertical" margin={{ left: 20, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="route_to" type="category" width={130} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={22}>
                {stats.routeDistribution.map((_, i) => (
                  <Cell key={i} fill={`hsl(${260 + i * 25}, 55%, 50%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
