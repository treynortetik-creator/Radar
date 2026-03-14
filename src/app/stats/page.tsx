'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area, Legend,
} from 'recharts';
import { LoadingRadar, AnalyticsIcon, TargetIcon, ShieldIcon, SignalIcon, GlobeIcon } from '@/components/icons';

const COMPETITOR_COLORS: Record<string, string> = {
  'Inspiren': '#CC4125',
  'Sage': '#B4A7D6',
  'VirtuSense': '#9900FF',
  'Amba': '#FF9900',
  'Nobi': '#B7E1CD',
  'CarePredict': '#F9CB9C',
  'Teton': '#5B9BD5',
};

const TIER_COLORS: Record<string, string> = {
  'Critical': '#ff5a4f',
  'High': '#da9a47',
  'Medium': '#d3ba56',
  'Low': '#86a954',
};

const TIER_ORDER = ['Critical', 'High', 'Medium', 'Low'];

interface StatsData {
  tierDistribution: { priority_tier: string; count: number }[];
  themeDistribution: { theme: string; count: number }[];
  competitorActivity: { competitor: string; count: number }[];
  routeDistribution: { route_to: string; count: number }[];
  weeklyTimeline: Record<string, string | number>[];
  competitorThemeMatrix: { competitor: string; themes: { theme: string; count: number }[] }[];
  totalEvents: number;
  industryNewsCount: number;
  industryNewsSources: { source: string; count: number }[];
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
  color = '#dbc55e',
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#10170e]/95 backdrop-blur border border-[#3c4b28] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1.5 font-medium">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-semibold flex items-center gap-2" style={{ color: entry.color || entry.fill }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
          {entry.name || entry.dataKey}: {entry.value}
        </p>
      ))}
    </div>
  );
};

function HeatmapCell({ count, max }: { count: number; max: number }) {
  const intensity = max > 0 ? count / max : 0;
  const bg = count === 0
    ? 'bg-slate-800/30'
    : '';
  const style = count > 0
    ? {
        backgroundColor: `rgba(219, 197, 94, ${0.1 + intensity * 0.7})`,
        color: intensity > 0.5 ? '#1a1f16' : '#aeb786',
      }
    : {};

  return (
    <div
      className={`flex items-center justify-center text-xs font-medium rounded h-8 min-w-[40px] transition-colors ${bg}`}
      style={style}
      title={`${count} events`}
    >
      {count > 0 ? count : ''}
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats);
  }, []);

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

  // Get competitor names for the area chart
  const competitors = stats.competitorActivity.map(c => c.competitor);

  // Get max value for heatmap color scaling
  const heatmapMax = Math.max(
    ...stats.competitorThemeMatrix.flatMap(r => r.themes.map(t => t.count)),
    1
  );

  // Get theme labels from matrix (use top 6 to keep readable)
  const allThemes = stats.competitorThemeMatrix[0]?.themes.map(t => t.theme) || [];
  const topThemes = stats.themeDistribution.slice(0, 6).map(t => t.theme);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-lime-500/20 border border-amber-500/30 flex items-center justify-center">
          <AnalyticsIcon className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Analytics</h1>
          <p className="text-sm text-slate-500">Intelligence overview and competitive landscape</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MiniStatCard label="Total Events" value={stats.totalEvents} color="#dbc55e" icon={TargetIcon} />
        <MiniStatCard label="High+ Threats" value={criticalHigh} color="#ff5a4f" icon={ShieldIcon} />
        <MiniStatCard label="Threat Rate" value={`${threatRate}%`} color="#da9a47" icon={SignalIcon} />
        <MiniStatCard
          label="Top Competitor"
          value={topCompetitor?.competitor || '—'}
          color={COMPETITOR_COLORS[topCompetitor?.competitor] || '#86a954'}
        />
        <MiniStatCard
          label="Industry Articles"
          value={stats.industryNewsCount}
          color="#64b5f6"
          icon={GlobeIcon}
        />
      </div>

      {/* Trend Over Time — full width */}
      {stats.weeklyTimeline.length > 1 && (
        <ChartCard title="Activity Trend" subtitle="Weekly event volume by competitor">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={stats.weeklyTimeline} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
              <defs>
                {competitors.map(comp => (
                  <linearGradient key={comp} id={`grad-${comp.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COMPETITOR_COLORS[comp] || '#64748b'} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={COMPETITOR_COLORS[comp] || '#64748b'} stopOpacity={0.05} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3a21" />
              <XAxis
                dataKey="week"
                tick={{ fill: '#718055', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: string) => {
                  const d = new Date(v + 'T00:00:00Z');
                  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
                }}
              />
              <YAxis tick={{ fill: '#718055', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, color: '#aeb786' }}
                iconType="circle"
                iconSize={8}
              />
              {competitors.map(comp => (
                <Area
                  key={comp}
                  type="monotone"
                  dataKey={comp}
                  stackId="1"
                  stroke={COMPETITOR_COLORS[comp] || '#64748b'}
                  fill={`url(#grad-${comp.replace(/\s/g, '')})`}
                  strokeWidth={1.5}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Competitor Activity */}
        <ChartCard title="Events by Competitor" subtitle="Total tracked events per competitor">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.competitorActivity} layout="vertical" margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3a21" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#718055', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="competitor" type="category" width={90} tick={{ fill: '#aeb786', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(219, 197, 94, 0.08)' }} />
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
                  stroke="#090d08"
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
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3a21" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#718055', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="theme" type="category" width={140} tick={{ fill: '#aeb786', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(219, 197, 94, 0.08)' }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={22}>
                {stats.themeDistribution.map((_, i) => (
                  <Cell key={i} fill={`hsl(${54 + i * 6}, 48%, ${56 - (i % 3) * 6}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Route Distribution */}
        <ChartCard title="Intelligence Routing" subtitle="Distribution by action required">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={stats.routeDistribution} layout="vertical" margin={{ left: 20, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3a21" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#718055', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="route_to" type="category" width={130} tick={{ fill: '#aeb786', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(219, 197, 94, 0.08)' }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={22}>
                {stats.routeDistribution.map((_, i) => (
                  <Cell key={i} fill={`hsl(${18 + i * 11}, 58%, ${56 - (i % 3) * 5}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Competitor × Theme Heatmap — full width */}
      {stats.competitorThemeMatrix.length > 0 && topThemes.length > 0 && (
        <ChartCard title="Competitor Focus Areas" subtitle="Event count by competitor and theme">
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Header row */}
              <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: `120px repeat(${topThemes.length}, 1fr)` }}>
                <div />
                {topThemes.map(theme => (
                  <div key={theme} className="text-[10px] text-slate-500 text-center font-medium truncate px-1">
                    {theme}
                  </div>
                ))}
              </div>
              {/* Data rows */}
              {stats.competitorThemeMatrix.map(row => (
                <div
                  key={row.competitor}
                  className="grid gap-1 mb-1"
                  style={{ gridTemplateColumns: `120px repeat(${topThemes.length}, 1fr)` }}
                >
                  <div className="flex items-center gap-2 pr-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COMPETITOR_COLORS[row.competitor] || '#64748b' }}
                    />
                    <span className="text-xs text-slate-300 font-medium truncate">{row.competitor}</span>
                  </div>
                  {topThemes.map(theme => {
                    const cell = row.themes.find(t => t.theme === theme);
                    return (
                      <HeatmapCell key={theme} count={cell?.count || 0} max={heatmapMax} />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      )}
    </div>
  );
}
