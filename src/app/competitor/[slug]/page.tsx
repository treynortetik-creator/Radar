'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { EventCard } from '@/components/EventCard';
import { TierBadge } from '@/components/TierBadge';
import { CompetitorAvatar } from '@/components/CompetitorBadge';
import {
  LoadingRadar, ChevronIcon, TargetIcon, ShieldIcon, ClockIcon,
  ExternalLinkIcon, PlusIcon, EditIcon, TrashIcon, CopyIcon, CheckIcon,
  UsersIcon, BoxIcon, SwordIcon,
} from '@/components/icons';
import Link from 'next/link';
import type { CompetitorExecutive, CompetitorProduct, BattleCard } from '@/lib/db';

// ── Types ──

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

interface ProfileData {
  id: number;
  name: string;
  slug: string;
  website: string | null;
  headquarters: string | null;
  founded: string | null;
  employees: string | null;
  description: string | null;
  weaknesses: string[] | null;
  products: string[] | null;
  employee_count: string | null;
  funding: string | null;
  market_segments: string[] | null;
  executives: CompetitorExecutive[];
  products_list: CompetitorProduct[];
  battle_card: BattleCard | null;
}

// ── Constants ──

const COMPETITOR_COLORS_MAP: Record<string, { primary: string; secondary: string }> = {
  'inspiren': { primary: '#CC4125', secondary: '#ff5a3c' },
  'sage': { primary: '#B4A7D6', secondary: '#c9bfe6' },
  'virtusense': { primary: '#9900FF', secondary: '#b84dff' },
  'amba': { primary: '#FF9900', secondary: '#ffb333' },
  'nobi': { primary: '#B7E1CD', secondary: '#d0eedf' },
  'carepredict': { primary: '#F9CB9C', secondary: '#fce0bf' },
};

const COMPETITOR_NAMES: Record<string, string> = {
  'inspiren': 'Inspiren',
  'sage': 'Sage',
  'virtusense': 'VirtuSense',
  'amba': 'Amba',
  'nobi': 'Nobi',
  'carepredict': 'CarePredict',
};

const TABS = [
  { id: 'overview', label: 'Overview', icon: TargetIcon },
  { id: 'executives', label: 'Executives', icon: UsersIcon },
  { id: 'products', label: 'Products', icon: BoxIcon },
  { id: 'battle-card', label: 'Battle Card', icon: SwordIcon },
  { id: 'activity', label: 'Activity', icon: ClockIcon },
  { id: 'trends', label: 'Trends', icon: ShieldIcon },
] as const;

type TabId = typeof TABS[number]['id'];

// ── Helpers ──

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getTabFromHash(): TabId {
  if (typeof window === 'undefined') return 'overview';
  const hash = window.location.hash.replace('#', '');
  if (TABS.some(t => t.id === hash)) return hash as TabId;
  return 'overview';
}

// ── Main Component ──

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

  // Set tab from URL hash on mount
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

  // Fetch data
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

  // Fetch profile data
  useEffect(() => {
    if (!competitorName) return;
    fetch('/api/competitors')
      .then(r => r.json())
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
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-amber-400 transition-colors">Command Center</Link>
        <ChevronIcon direction="right" className="w-3 h-3" />
        <span style={{ color: colors.secondary }}>{competitorName}</span>
      </div>

      {/* Header */}
      <div className="card-base p-6">
        <div className="flex items-start gap-4">
          <CompetitorAvatar competitor={competitorName} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">{competitorName}</h1>
              {profile?.website && (
                <a
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
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
                  <UsersIcon className="w-3.5 h-3.5" />
                  ~{profile.employee_count} employees
                </span>
              )}
              {profile?.founded && (
                <span>Founded {profile.founded}</span>
              )}
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

      {/* Tab Bar */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-slate-700/40 pb-px">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg
                transition-all duration-150 whitespace-nowrap border-b-2 -mb-px
                ${isActive
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

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === 'overview' && (
          <OverviewTab info={info} profile={profile} colors={colors} events={events} />
        )}
        {activeTab === 'executives' && profile && (
          <ExecutivesTab profile={profile} onRefresh={refreshProfile} />
        )}
        {activeTab === 'products' && profile && (
          <ProductsTab profile={profile} onRefresh={refreshProfile} />
        )}
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
        {activeTab === 'trends' && (
          <TrendsTab info={info} events={events} colors={colors} />
        )}
      </div>
    </div>
  );
}

// ── Overview Tab ──

function OverviewTab({
  info, profile, colors, events,
}: {
  info: CompetitorData;
  profile: ProfileData | null;
  colors: { primary: string; secondary: string };
  events: Event[];
}) {
  const threatRate = Math.round(((info.critical_count + info.high_count) / info.total_events) * 100);

  const themeMap = new Map<string, number>();
  events.forEach(e => { themeMap.set(e.theme, (themeMap.get(e.theme) || 0) + 1); });
  const themes = Array.from(themeMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const keyTakeaways = events
    .filter(e => (e.priority_tier === 'Critical' || e.priority_tier === 'High') && e.key_takeaway)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-base p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Company Details</h3>
            <div className="space-y-3 text-sm">
              {profile.headquarters && <DetailRow label="Headquarters" value={profile.headquarters} />}
              {profile.founded && <DetailRow label="Founded" value={profile.founded} />}
              {profile.employee_count && <DetailRow label="Employees" value={`~${profile.employee_count}`} />}
              {profile.funding && <DetailRow label="Funding" value={profile.funding} />}
              {profile.website && (
                <DetailRow label="Website" value={
                  <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1">
                    {profile.website} <ExternalLinkIcon className="w-3 h-3" />
                  </a>
                } />
              )}
            </div>
          </div>

          <div className="card-base p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Market Segments</h3>
            {profile.market_segments && profile.market_segments.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.market_segments.map(seg => (
                  <span key={seg} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800/60 text-slate-300 border border-slate-700/40">
                    {seg}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No market segments defined</p>
            )}

            {profile.weaknesses && profile.weaknesses.length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-slate-200 mt-4">Known Weaknesses</h3>
                <ul className="space-y-1.5">
                  {profile.weaknesses.map((w, i) => (
                    <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">&#x25CF;</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">Quick Stats</h2>
          <div className="card-base p-4 space-y-4">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Avg Priority Score</div>
              <div className="text-2xl font-bold text-slate-200 tabular-nums">{info.avg_priority?.toFixed(1)}</div>
            </div>
            <div className="divider" />
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">High+ Threat Rate</div>
              <div
                className="text-2xl font-bold tabular-nums"
                style={{ color: threatRate > 50 ? '#ef4444' : threatRate > 30 ? '#f97316' : '#22c55e' }}
              >
                {threatRate}%
              </div>
            </div>
            <div className="divider" />
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">Top Themes</div>
              <div className="space-y-2.5">
                {themes.map(([theme, count]) => (
                  <div key={theme} className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 truncate mr-2">{theme}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(count / info.total_events) * 100}%`, backgroundColor: colors.primary }}
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

        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">Key Intelligence</h2>
          {keyTakeaways.length > 0 ? (
            <div className="space-y-3">
              {keyTakeaways.map((event) => (
                <div key={event.id} className="card-base p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TierBadge tier={event.priority_tier} size="xs" />
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <ClockIcon className="w-3 h-3" />
                      {formatDate(event.published_at)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{event.key_takeaway}</p>
                  <p className="text-xs text-slate-500 mt-2 truncate">{event.title}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-base p-8 text-center">
              <ShieldIcon variant="default" className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No high-priority takeaways yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-slate-500 uppercase tracking-wider font-medium shrink-0">{label}</span>
      <span className="text-sm text-slate-300 text-right">{value}</span>
    </div>
  );
}

// ── Executives Tab ──

function ExecutivesTab({ profile, onRefresh }: { profile: ProfileData; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', title: '', linkedin_url: '', background: '', started_role: '', source: '', is_current: true });

  const resetForm = () => {
    setForm({ name: '', title: '', linkedin_url: '', background: '', started_role: '', source: '', is_current: true });
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (exec: CompetitorExecutive) => {
    setForm({
      name: exec.name,
      title: exec.title,
      linkedin_url: exec.linkedin_url || '',
      background: exec.background || '',
      started_role: exec.started_role || '',
      source: exec.source || '',
      is_current: exec.is_current,
    });
    setEditingId(exec.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.title) return;
    setSaving(true);
    try {
      const url = editingId
        ? `/api/competitors/${profile.id}/executives/${editingId}`
        : `/api/competitors/${profile.id}/executives`;
      await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      resetForm();
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this executive?')) return;
    await fetch(`/api/competitors/${profile.id}/executives/${id}`, { method: 'DELETE' });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">
          C-Suite & Key Executives
          <span className="ml-2 text-xs font-normal text-slate-500">({profile.executives.length})</span>
        </h2>
        {!showForm && (
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary text-xs flex items-center gap-1.5">
            <PlusIcon className="w-3.5 h-3.5" /> Add Executive
          </button>
        )}
      </div>

      {showForm && (
        <div className="card-base p-5 space-y-4 expand-content">
          <h3 className="text-sm font-semibold text-slate-200">{editingId ? 'Edit' : 'Add'} Executive</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="input-base" placeholder="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input className="input-base" placeholder="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <input className="input-base" placeholder="LinkedIn URL" value={form.linkedin_url} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))} />
            <input className="input-base" placeholder="Started Role (e.g., 2023)" value={form.started_role} onChange={e => setForm(f => ({ ...f, started_role: e.target.value }))} />
            <input className="input-base md:col-span-2" placeholder="Background" value={form.background} onChange={e => setForm(f => ({ ...f, background: e.target.value }))} />
            <input className="input-base" placeholder="Source" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} />
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input type="checkbox" checked={form.is_current} onChange={e => setForm(f => ({ ...f, is_current: e.target.checked }))} className="accent-amber-500" />
              Currently in role
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.name || !form.title} className="btn-primary text-xs">
              {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
            </button>
            <button onClick={resetForm} className="btn-ghost text-xs">Cancel</button>
          </div>
        </div>
      )}

      {profile.executives.length > 0 ? (
        <div className="card-base overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/40">
                <th className="text-left text-[10px] text-slate-500 uppercase tracking-wider font-medium px-4 py-3">Name</th>
                <th className="text-left text-[10px] text-slate-500 uppercase tracking-wider font-medium px-4 py-3">Title</th>
                <th className="text-left text-[10px] text-slate-500 uppercase tracking-wider font-medium px-4 py-3 hidden md:table-cell">Since</th>
                <th className="text-left text-[10px] text-slate-500 uppercase tracking-wider font-medium px-4 py-3 hidden lg:table-cell">Background</th>
                <th className="text-right text-[10px] text-slate-500 uppercase tracking-wider font-medium px-4 py-3 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profile.executives.map(exec => (
                <tr key={exec.id} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${exec.is_current ? 'text-slate-200' : 'text-slate-500'}`}>
                        {exec.name}
                      </span>
                      {!exec.is_current && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">Former</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">{exec.title}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 hidden md:table-cell">{exec.started_role || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell max-w-xs truncate">{exec.background || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {exec.linkedin_url && (
                        <a href={exec.linkedin_url} target="_blank" rel="noopener noreferrer" className="btn-icon w-7 h-7">
                          <ExternalLinkIcon className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button onClick={() => startEdit(exec)} className="btn-icon w-7 h-7">
                        <EditIcon className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(exec.id)} className="btn-icon danger w-7 h-7">
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !showForm ? (
        <div className="card-base p-8 text-center">
          <UsersIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No executives tracked yet</p>
          <button onClick={() => setShowForm(true)} className="text-xs text-amber-400 hover:text-amber-300 mt-2 font-medium">
            Add the first executive
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ── Products Tab ──

function ProductsTab({ profile, onRefresh }: { profile: ProfileData; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', pricing: '', technology: '', limitations: '', features: '' });

  const resetForm = () => {
    setForm({ name: '', description: '', pricing: '', technology: '', limitations: '', features: '' });
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (prod: CompetitorProduct) => {
    setForm({
      name: prod.name,
      description: prod.description || '',
      pricing: prod.pricing || '',
      technology: prod.technology || '',
      limitations: prod.limitations?.join('\n') || '',
      features: prod.features ? JSON.stringify(prod.features, null, 2) : '',
    });
    setEditingId(prod.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      let features = null;
      if (form.features.trim()) {
        try { features = JSON.parse(form.features); } catch { features = null; }
      }
      const url = editingId
        ? `/api/competitors/${profile.id}/products/${editingId}`
        : `/api/competitors/${profile.id}/products`;
      await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          pricing: form.pricing || null,
          technology: form.technology || null,
          limitations: form.limitations ? form.limitations.split('\n').filter(Boolean) : null,
          features,
        }),
      });
      resetForm();
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this product?')) return;
    await fetch(`/api/competitors/${profile.id}/products/${id}`, { method: 'DELETE' });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">
          Products & Features
          <span className="ml-2 text-xs font-normal text-slate-500">({profile.products_list.length})</span>
        </h2>
        {!showForm && (
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary text-xs flex items-center gap-1.5">
            <PlusIcon className="w-3.5 h-3.5" /> Add Product
          </button>
        )}
      </div>

      {showForm && (
        <div className="card-base p-5 space-y-4 expand-content">
          <h3 className="text-sm font-semibold text-slate-200">{editingId ? 'Edit' : 'Add'} Product</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="input-base" placeholder="Product Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input className="input-base" placeholder="Pricing" value={form.pricing} onChange={e => setForm(f => ({ ...f, pricing: e.target.value }))} />
            <input className="input-base md:col-span-2" placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <input className="input-base" placeholder="Technology" value={form.technology} onChange={e => setForm(f => ({ ...f, technology: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Limitations (one per line)</label>
            <textarea className="input-base" rows={3} placeholder="Enter limitations, one per line" value={form.limitations} onChange={e => setForm(f => ({ ...f, limitations: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Features (JSON array, optional)</label>
            <textarea className="input-base font-mono text-xs" rows={3} placeholder='[{"name": "Feature", "description": "..."}]' value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.name} className="btn-primary text-xs">
              {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
            </button>
            <button onClick={resetForm} className="btn-ghost text-xs">Cancel</button>
          </div>
        </div>
      )}

      {profile.products_list.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profile.products_list.map(prod => (
            <div key={prod.id} className="card-base p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">{prod.name}</h3>
                  {prod.pricing && (
                    <span className="text-xs text-emerald-400 font-medium">{prod.pricing}</span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(prod)} className="btn-icon w-7 h-7">
                    <EditIcon className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(prod.id)} className="btn-icon danger w-7 h-7">
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {prod.description && (
                <p className="text-xs text-slate-400 leading-relaxed">{prod.description}</p>
              )}

              {prod.technology && (
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Technology</span>
                  <p className="text-xs text-slate-400 mt-0.5">{prod.technology}</p>
                </div>
              )}

              {prod.features && Array.isArray(prod.features) && prod.features.length > 0 && (
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Features</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {prod.features.map((f: Record<string, string> | string, i: number) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-lime-500/10 text-lime-300 border border-lime-500/20">
                        {typeof f === 'string' ? f : (f as Record<string, string>).name || JSON.stringify(f)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {prod.limitations && prod.limitations.length > 0 && (
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Limitations</span>
                  <ul className="mt-1 space-y-1">
                    {prod.limitations.map((lim, i) => (
                      <li key={i} className="text-xs text-red-400/80 flex items-start gap-1.5">
                        <span className="mt-0.5">&#x25CF;</span> {lim}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : !showForm ? (
        <div className="card-base p-8 text-center">
          <BoxIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No products tracked yet</p>
          <button onClick={() => setShowForm(true)} className="text-xs text-amber-400 hover:text-amber-300 mt-2 font-medium">
            Add the first product
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ── Battle Card Tab ──

function BattleCardTab({ profile, onRefresh }: { profile: ProfileData; onRefresh: () => void }) {
  const bc = profile.battle_card;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    when_they_come_up: bc?.when_they_come_up || '',
    their_pitch: bc?.their_pitch || '',
    our_counter: bc?.our_counter || '',
    landmines: bc?.landmines || '',
    proof_points: bc?.proof_points?.join('\n') || '',
    objection_handling: bc?.objection_handling ? JSON.stringify(bc.objection_handling, null, 2) : '[{"objection": "", "response": ""}]',
  });

  useEffect(() => {
    if (bc) {
      setForm({
        when_they_come_up: bc.when_they_come_up || '',
        their_pitch: bc.their_pitch || '',
        our_counter: bc.our_counter || '',
        landmines: bc.landmines || '',
        proof_points: bc.proof_points?.join('\n') || '',
        objection_handling: bc.objection_handling ? JSON.stringify(bc.objection_handling, null, 2) : '[{"objection": "", "response": ""}]',
      });
    }
  }, [bc]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let objection_handling = null;
      try { objection_handling = JSON.parse(form.objection_handling); } catch { /* keep null */ }
      await fetch(`/api/competitors/${profile.id}/battle-card`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          when_they_come_up: form.when_they_come_up || null,
          their_pitch: form.their_pitch || null,
          our_counter: form.our_counter || null,
          landmines: form.landmines || null,
          proof_points: form.proof_points ? form.proof_points.split('\n').filter(Boolean) : null,
          objection_handling,
          last_reviewed_at: new Date().toISOString(),
        }),
      });
      setEditing(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { key: 'when_they_come_up', label: 'When They Come Up', content: bc?.when_they_come_up, color: 'amber' },
    { key: 'their_pitch', label: 'Their Pitch', content: bc?.their_pitch, color: 'blue' },
    { key: 'our_counter', label: 'Our Counter', content: bc?.our_counter, color: 'emerald' },
    { key: 'landmines', label: 'Landmines', content: bc?.landmines, color: 'red' },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">Battle Card</h2>
        <div className="flex items-center gap-2">
          {bc?.last_reviewed_at && (
            <span className="text-[10px] text-slate-500">
              Last reviewed: {new Date(bc.last_reviewed_at).toLocaleDateString()}
            </span>
          )}
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-primary text-xs flex items-center gap-1.5">
              <EditIcon className="w-3.5 h-3.5" /> {bc ? 'Edit' : 'Create'} Battle Card
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="btn-primary text-xs">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} className="btn-ghost text-xs">Cancel</button>
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-4">
          {sections.map(s => (
            <div key={s.key} className="card-base p-4">
              <label className="text-xs font-semibold text-slate-300 mb-2 block">{s.label}</label>
              <textarea
                className="input-base"
                rows={3}
                value={form[s.key]}
                onChange={e => setForm(f => ({ ...f, [s.key]: e.target.value }))}
                placeholder={`Enter ${s.label.toLowerCase()}...`}
              />
            </div>
          ))}
          <div className="card-base p-4">
            <label className="text-xs font-semibold text-slate-300 mb-2 block">Proof Points (one per line)</label>
            <textarea
              className="input-base"
              rows={4}
              value={form.proof_points}
              onChange={e => setForm(f => ({ ...f, proof_points: e.target.value }))}
              placeholder="Enter proof points, one per line"
            />
          </div>
          <div className="card-base p-4">
            <label className="text-xs font-semibold text-slate-300 mb-2 block">Objection Handling (JSON)</label>
            <textarea
              className="input-base font-mono text-xs"
              rows={6}
              value={form.objection_handling}
              onChange={e => setForm(f => ({ ...f, objection_handling: e.target.value }))}
              placeholder='[{"objection": "Too expensive", "response": "4-month payback..."}]'
            />
          </div>
        </div>
      ) : bc ? (
        <div className="space-y-4">
          {sections.map(s => s.content && (
            <BattleCardSection key={s.key} label={s.label} content={s.content} color={s.color} />
          ))}

          {bc.proof_points && bc.proof_points.length > 0 && (
            <div className="card-base p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Proof Points</h3>
                <CopyButton text={bc.proof_points.join('\n')} />
              </div>
              <ul className="space-y-2">
                {bc.proof_points.map((pp, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5 shrink-0">&#x2713;</span>
                    {pp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {bc.objection_handling && Array.isArray(bc.objection_handling) && bc.objection_handling.length > 0 && (
            <div className="card-base p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Objection Handling</h3>
                <CopyButton text={bc.objection_handling.map(o => `Objection: ${o.objection}\nResponse: ${o.response}`).join('\n\n')} />
              </div>
              <div className="space-y-3">
                {bc.objection_handling.map((oh, i) => (
                  <div key={i} className="bg-slate-900/40 rounded-lg p-3">
                    <div className="text-xs text-red-400 font-medium mb-1">
                      &ldquo;{oh.objection}&rdquo;
                    </div>
                    <div className="text-sm text-slate-300 leading-relaxed">{oh.response}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card-base p-8 text-center">
          <SwordIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No battle card created yet</p>
          <button onClick={() => setEditing(true)} className="text-xs text-amber-400 hover:text-amber-300 mt-2 font-medium">
            Create battle card
          </button>
        </div>
      )}
    </div>
  );
}

function BattleCardSection({ label, content, color }: { label: string; content: string; color: string }) {
  const colorMap: Record<string, { border: string; bg: string; text: string }> = {
    amber: { border: 'border-l-amber-500', bg: 'bg-amber-500/5', text: 'text-amber-400' },
    blue: { border: 'border-l-lime-500', bg: 'bg-lime-500/5', text: 'text-lime-300' },
    emerald: { border: 'border-l-emerald-500', bg: 'bg-emerald-500/5', text: 'text-emerald-400' },
    red: { border: 'border-l-red-500', bg: 'bg-red-500/5', text: 'text-red-400' },
  };
  const c = colorMap[color] || colorMap.amber;

  return (
    <div className={`card-base p-5 ${c.bg}`} style={{ borderLeftWidth: '3px', borderLeftColor: color === 'amber' ? '#d3ba56' : color === 'blue' ? '#9fca79' : color === 'emerald' ? '#86a954' : '#ff5a4f', borderLeftStyle: 'solid' }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`text-xs font-semibold uppercase tracking-wider ${c.text}`}>{label}</h3>
        <CopyButton text={`${label}:\n${content}`} />
      </div>
      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={handleCopy} className="btn-icon w-7 h-7" title="Copy to clipboard">
      {copied ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <CopyIcon className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Activity Tab (existing event feed — preserved) ──

function ActivityTab({
  info, events, filterTier, setFilterTier,
}: {
  info: CompetitorData;
  events: Event[];
  filterTier: string;
  setFilterTier: (t: string) => void;
}) {
  const tiers = [
    { name: 'Critical', count: info.critical_count, color: '#ef4444' },
    { name: 'High', count: info.high_count, color: '#f97316' },
    { name: 'Medium', count: info.medium_count, color: '#eab308' },
    { name: 'Low', count: info.low_count, color: '#22c55e' },
  ];

  const filteredEvents = filterTier ? events.filter(e => e.priority_tier === filterTier) : events;

  return (
    <div className="space-y-6">
      <div className="card-base p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">Threat Distribution</h2>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {tiers.map(t => (
            <button
              key={t.name}
              onClick={() => setFilterTier(filterTier === t.name ? '' : t.name)}
              className={`
                text-center p-4 rounded-xl border transition-all duration-200
                ${filterTier === t.name
                  ? 'ring-2 ring-offset-2 ring-offset-[#090d08]'
                  : 'border-slate-700/40 hover:border-slate-600'
                }
              `}
              style={filterTier === t.name ? {
                borderColor: t.color,
                backgroundColor: `${t.color}15`,
                ['--tw-ring-color' as string]: t.color,
              } : {}}
            >
              <div className="text-2xl font-bold tabular-nums mb-1" style={{ color: t.color }}>{t.count}</div>
              <TierBadge tier={t.name} size="xs" />
            </button>
          ))}
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-slate-800/60">
          {tiers.filter(t => t.count > 0).map(t => (
            <div
              key={t.name}
              className="transition-all duration-500 first:rounded-l-full last:rounded-r-full"
              style={{
                backgroundColor: t.color,
                width: `${(t.count / info.total_events) * 100}%`,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
              }}
            />
          ))}
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-200">
            {filterTier ? `${filterTier} Events` : 'All Events'}
            <span className="ml-2 text-xs font-normal text-slate-500">({filteredEvents.length})</span>
          </h2>
          {filterTier && (
            <button onClick={() => setFilterTier('')} className="btn-ghost text-xs">Show all</button>
          )}
        </div>
        <div className="space-y-3">
          {filteredEvents.map((e, i) => (
            <div key={e.id} className={`animate-fade-in stagger-${Math.min(i + 1, 5)}`}>
              <EventCard event={e} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Trends Tab (existing threat chart — preserved) ──

function TrendsTab({
  info, events, colors,
}: {
  info: CompetitorData;
  events: Event[];
  colors: { primary: string; secondary: string };
}) {
  const weeklyData = (() => {
    const weeks = new Map<string, { critical: number; high: number; medium: number; low: number; total: number }>();
    events.forEach(e => {
      if (!e.published_at) return;
      const d = new Date(e.published_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      if (!weeks.has(key)) weeks.set(key, { critical: 0, high: 0, medium: 0, low: 0, total: 0 });
      const w = weeks.get(key)!;
      w.total++;
      if (e.priority_tier === 'Critical') w.critical++;
      else if (e.priority_tier === 'High') w.high++;
      else if (e.priority_tier === 'Medium') w.medium++;
      else w.low++;
    });
    return Array.from(weeks.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12);
  })();

  const maxEvents = Math.max(...weeklyData.map(([, w]) => w.total), 1);

  return (
    <div className="space-y-6">
      <div className="card-base p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">Event Activity Trend (Last 12 Weeks)</h2>
        {weeklyData.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-end gap-2 h-40">
              {weeklyData.map(([week, data]) => (
                <div key={week} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col-reverse gap-0.5" style={{ height: `${(data.total / maxEvents) * 100}%` }}>
                    {data.low > 0 && <div className="w-full rounded-t-sm bg-emerald-500/60" style={{ height: `${(data.low / data.total) * 100}%` }} />}
                    {data.medium > 0 && <div className="w-full bg-yellow-500/60" style={{ height: `${(data.medium / data.total) * 100}%` }} />}
                    {data.high > 0 && <div className="w-full bg-orange-500/60" style={{ height: `${(data.high / data.total) * 100}%` }} />}
                    {data.critical > 0 && <div className="w-full rounded-t-sm bg-red-500/60" style={{ height: `${(data.critical / data.total) * 100}%` }} />}
                  </div>
                  <span className="text-[9px] text-slate-600 tabular-nums">
                    {new Date(week + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 justify-center text-[10px] text-slate-500">
              {[
                { label: 'Critical', color: 'bg-red-500/60' },
                { label: 'High', color: 'bg-orange-500/60' },
                { label: 'Medium', color: 'bg-yellow-500/60' },
                { label: 'Low', color: 'bg-emerald-500/60' },
              ].map(l => (
                <span key={l.label} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-sm ${l.color}`} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500">Not enough data for trend analysis</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: info.total_events, color: colors.primary },
          { label: 'Critical', value: info.critical_count, color: '#ef4444' },
          { label: 'High', value: info.high_count, color: '#f97316' },
          { label: 'Avg Score', value: info.avg_priority?.toFixed(1), color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
