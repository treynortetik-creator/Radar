import type { ReactNode } from 'react';
import { TierBadge } from '@/components/TierBadge';
import { ClockIcon, ExternalLinkIcon, ShieldIcon } from '@/components/icons';
import { formatDate } from './helpers';
import type { CompetitorData, Event, ProfileData } from './types';

export function OverviewTab({
  info,
  profile,
  colors,
  events,
}: {
  info: CompetitorData;
  profile: ProfileData | null;
  colors: { primary: string; secondary: string };
  events: Event[];
}) {
  const threatRate = Math.round(((info.critical_count + info.high_count) / info.total_events) * 100);

  const themeMap = new Map<string, number>();
  events.forEach((e) => {
    themeMap.set(e.theme, (themeMap.get(e.theme) || 0) + 1);
  });
  const themes = Array.from(themeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const keyTakeaways = events
    .filter((e) => (e.priority_tier === 'Critical' || e.priority_tier === 'High') && e.key_takeaway)
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
              {profile.employee_count && (
                <DetailRow label="Employees" value={`~${profile.employee_count}`} />
              )}
              {profile.funding && <DetailRow label="Funding" value={profile.funding} />}
              {profile.website && (
                <DetailRow
                  label="Website"
                  value={
                    <a
                      href={
                        profile.website.startsWith('http')
                          ? profile.website
                          : `https://${profile.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      {profile.website} <ExternalLinkIcon className="w-3 h-3" />
                    </a>
                  }
                />
              )}
            </div>
          </div>

          <div className="card-base p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Market Segments</h3>
            {profile.market_segments && profile.market_segments.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.market_segments.map((seg) => (
                  <span
                    key={seg}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800/60 text-slate-300 border border-slate-700/40"
                  >
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
              <div className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">
                Avg Priority Score
              </div>
              <div className="text-2xl font-bold text-slate-200 tabular-nums">
                {info.avg_priority?.toFixed(1)}
              </div>
            </div>
            <div className="divider" />
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">
                High+ Threat Rate
              </div>
              <div
                className="text-2xl font-bold tabular-nums"
                style={{
                  color: threatRate > 50 ? '#ef4444' : threatRate > 30 ? '#f97316' : '#22c55e',
                }}
              >
                {threatRate}%
              </div>
            </div>
            <div className="divider" />
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">
                Top Themes
              </div>
              <div className="space-y-2.5">
                {themes.map(([theme, count]) => (
                  <div key={theme} className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 truncate mr-2">{theme}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(count / info.total_events) * 100}%`,
                            backgroundColor: colors.primary,
                          }}
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

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-slate-500 uppercase tracking-wider font-medium shrink-0">{label}</span>
      <span className="text-sm text-slate-300 text-right">{value}</span>
    </div>
  );
}
