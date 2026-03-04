import type { CompetitorData, Event } from './types';

export function TrendsTab({
  info,
  events,
  colors,
}: {
  info: CompetitorData;
  events: Event[];
  colors: { primary: string; secondary: string };
}) {
  const weeklyData = (() => {
    const weeks = new Map<
      string,
      { critical: number; high: number; medium: number; low: number; total: number }
    >();

    events.forEach((e) => {
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
                  <div
                    className="w-full flex flex-col-reverse gap-0.5"
                    style={{ height: `${(data.total / maxEvents) * 100}%` }}
                  >
                    {data.low > 0 && (
                      <div
                        className="w-full rounded-t-sm bg-emerald-500/60"
                        style={{ height: `${(data.low / data.total) * 100}%` }}
                      />
                    )}
                    {data.medium > 0 && (
                      <div
                        className="w-full bg-yellow-500/60"
                        style={{ height: `${(data.medium / data.total) * 100}%` }}
                      />
                    )}
                    {data.high > 0 && (
                      <div
                        className="w-full bg-orange-500/60"
                        style={{ height: `${(data.high / data.total) * 100}%` }}
                      />
                    )}
                    {data.critical > 0 && (
                      <div
                        className="w-full rounded-t-sm bg-red-500/60"
                        style={{ height: `${(data.critical / data.total) * 100}%` }}
                      />
                    )}
                  </div>
                  <span className="text-[9px] text-slate-600 tabular-nums">
                    {new Date(week + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
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
              ].map((l) => (
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
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-value" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
