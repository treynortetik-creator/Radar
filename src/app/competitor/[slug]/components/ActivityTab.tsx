import { EventCard } from '@/components/EventCard';
import { TierBadge } from '@/components/TierBadge';
import type { CompetitorData, Event } from './types';

export function ActivityTab({
  info,
  events,
  filterTier,
  setFilterTier,
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

  const filteredEvents = filterTier ? events.filter((e) => e.priority_tier === filterTier) : events;

  return (
    <div className="space-y-6">
      <div className="card-base p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">Threat Distribution</h2>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {tiers.map((t) => (
            <button
              key={t.name}
              onClick={() => setFilterTier(filterTier === t.name ? '' : t.name)}
              className={`
                text-center p-4 rounded-xl border transition-all duration-200
                ${
                  filterTier === t.name
                    ? 'ring-2 ring-offset-2 ring-offset-[#090d08]'
                    : 'border-slate-700/40 hover:border-slate-600'
                }
              `}
              style={
                filterTier === t.name
                  ? {
                      borderColor: t.color,
                      backgroundColor: `${t.color}15`,
                      ['--tw-ring-color' as string]: t.color,
                    }
                  : {}
              }
            >
              <div className="text-2xl font-bold tabular-nums mb-1" style={{ color: t.color }}>
                {t.count}
              </div>
              <TierBadge tier={t.name} size="xs" />
            </button>
          ))}
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-slate-800/60">
          {tiers
            .filter((t) => t.count > 0)
            .map((t) => (
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
            <button onClick={() => setFilterTier('')} className="btn-ghost text-xs">
              Show all
            </button>
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
