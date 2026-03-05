'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CompetitorAvatar } from '@/components/CompetitorBadge';
import {
  ChevronIcon,
  ClockIcon,
  ExternalLinkIcon,
  LoadingRadar,
  TargetIcon,
  UsersIcon,
} from '@/components/icons';
import { ActivityTab } from './components/ActivityTab';
import { BattleCardTab } from './components/BattleCardTab';
import {
  COMPETITOR_COLORS_MAP,
  COMPETITOR_NAMES,
  TABS,
  type TabId,
} from './components/constants';
import { ExecutivesTab } from './components/ExecutivesTab';
import { formatDate, getTabFromHash } from './components/helpers';
import { OverviewTab } from './components/OverviewTab';
import { ProductsTab } from './components/ProductsTab';
import { TrendsTab } from './components/TrendsTab';
import type { CompetitorData, Event, ProfileData } from './components/types';

export default function CompetitorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const competitorName = COMPETITOR_NAMES[slug] || slug;
  const colors = COMPETITOR_COLORS_MAP[slug] || { primary: '#94a3b8', secondary: '#b0bec5' };

  const [info, setInfo] = useState<CompetitorData | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [filterTier, setFilterTier] = useState('');

  useEffect(() => {
    setActiveTab(getTabFromHash());
    const onHash = () => setActiveTab(getTabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const switchTab = useCallback((tab: TabId) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `#${tab}`);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/competitors').then((r) => r.json()),
      fetch(`/api/events?competitor=${competitorName}&limit=200`).then((r) => r.json()),
    ]).then(([competitors, eventsData]) => {
      const comp = competitors.find((c: CompetitorData) => c.competitor === competitorName);
      setInfo(comp || null);
      setEvents(eventsData.events);
      setLoading(false);
    });
  }, [competitorName]);

  useEffect(() => {
    if (!competitorName) return;
    fetch('/api/competitors')
      .then((r) => r.json())
      .then(async () => {
        const eventsRes = await fetch(`/api/events?competitor=${competitorName}&limit=1`);
        const eventsData = await eventsRes.json();
        if (eventsData.events?.[0]?.competitor_id) {
          const pid = eventsData.events[0].competitor_id;
          const profileRes = await fetch(`/api/competitors/${pid}/profile`);
          if (profileRes.ok) {
            setProfile(await profileRes.json());
          }
        }
      })
      .catch(console.error);
  }, [competitorName]);

  const refreshProfile = useCallback(async () => {
    if (!profile?.id) return;
    const res = await fetch(`/api/competitors/${profile.id}/profile`);
    if (res.ok) setProfile(await res.json());
  }, [profile?.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <LoadingRadar className="w-16 h-16 text-amber-500" />
        <span className="text-sm text-slate-500 font-medium">Loading competitor profile...</span>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4">
          <TargetIcon className="w-8 h-8 text-slate-600" />
        </div>
        <div className="text-lg font-semibold text-slate-300 mb-1">Competitor not found</div>
        <div className="text-sm text-slate-500 mb-4">No data available for this competitor</div>
        <Link
          href="/"
          className="text-sm text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
        >
          <ChevronIcon direction="left" className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-amber-400 transition-colors">
          Command Center
        </Link>
        <ChevronIcon direction="right" className="w-3 h-3" />
        <span style={{ color: colors.secondary }}>{competitorName}</span>
      </div>

      <div className="card-base p-6">
        <div className="flex items-start gap-4">
          <CompetitorAvatar competitor={competitorName} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">{competitorName}</h1>
              {profile?.website && (
                <a
                  href={
                    profile.website.startsWith('http') ? profile.website : `https://${profile.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-amber-400 transition-colors"
                >
                  <ExternalLinkIcon className="w-4 h-4" />
                </a>
              )}
            </div>
            {profile?.description && (
              <p className="text-sm text-slate-400 mb-2 line-clamp-2">{profile.description}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
              {profile?.headquarters && (
                <span className="flex items-center gap-1">
                  <span className="text-slate-600">HQ:</span> {profile.headquarters}
                </span>
              )}
              {profile?.employee_count && (
                <span className="flex items-center gap-1">
                  <UsersIcon className="w-3.5 h-3.5" />~{profile.employee_count} employees
                </span>
              )}
              {profile?.founded && <span>Founded {profile.founded}</span>}
              {profile?.funding && (
                <span className="flex items-center gap-1">
                  <span className="text-emerald-400">$</span> {profile.funding}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <TargetIcon className="w-3.5 h-3.5" />
                {info.total_events} events tracked
              </span>
              <span className="flex items-center gap-1.5">
                <ClockIcon className="w-3.5 h-3.5" />
                Last: {formatDate(info.latest_event)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-slate-700/40 pb-px">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg
                transition-all duration-150 whitespace-nowrap border-b-2 -mb-px
                ${
                  isActive
                    ? 'text-amber-400 border-amber-400 bg-amber-500/5'
                    : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/30'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="animate-fade-in">
        {activeTab === 'overview' && (
          <OverviewTab info={info} profile={profile} colors={colors} events={events} />
        )}
        {activeTab === 'executives' && profile && <ExecutivesTab profile={profile} onRefresh={refreshProfile} />}
        {activeTab === 'products' && profile && <ProductsTab profile={profile} onRefresh={refreshProfile} />}
        {activeTab === 'battle-card' && profile && (
          <BattleCardTab profile={profile} onRefresh={refreshProfile} />
        )}
        {activeTab === 'activity' && (
          <ActivityTab
            info={info}
            events={events}
            filterTier={filterTier}
            setFilterTier={setFilterTier}
          />
        )}
        {activeTab === 'trends' && <TrendsTab info={info} events={events} colors={colors} />}
      </div>
    </div>
  );
}
