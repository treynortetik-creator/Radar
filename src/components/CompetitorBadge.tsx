'use client';

const COMPETITOR_COLORS: Record<string, string> = {
  'Inspiren': '#CC4125',
  'Sage': '#B4A7D6',
  'VirtuSense': '#9900FF',
  'Amba': '#FF9900',
  'Nobi': '#B7E1CD',
  'CarePredict': '#F9CB9C',
};

export function CompetitorBadge({ competitor, showDot = true }: { competitor: string; showDot?: boolean }) {
  const color = COMPETITOR_COLORS[competitor] || '#94a3b8';
  return (
    <span 
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium"
      style={{ 
        backgroundColor: `${color}15`, 
        color: color, 
      }}
    >
      {showDot && (
        <span 
          className="w-2 h-2 rounded-full shrink-0" 
          style={{ backgroundColor: color }} 
        />
      )}
      {competitor}
    </span>
  );
}

export function CompetitorPill({ 
  competitor, 
  count, 
  criticalCount = 0,
  isActive = false,
  onClick 
}: { 
  competitor: string; 
  count: number; 
  criticalCount?: number;
  isActive?: boolean;
  onClick?: () => void;
}) {
  const color = COMPETITOR_COLORS[competitor] || '#94a3b8';
  return (
    <button 
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 border ${
        isActive ? 'ring-1 ring-offset-1 ring-offset-slate-900' : ''
      }`}
      style={{ 
        backgroundColor: isActive ? `${color}20` : `${color}08`, 
        borderColor: isActive ? `${color}50` : `${color}20`,
        color: color,
        ...(isActive ? { ringColor: color } : {}),
      }}
    >
      <span 
        className="w-2.5 h-2.5 rounded-full shrink-0" 
        style={{ backgroundColor: color }} 
      />
      <span>{competitor}</span>
      <span 
        className="text-xs font-normal px-1.5 py-0.5 rounded-full"
        style={{ backgroundColor: `${color}20` }}
      >
        {count}
      </span>
      {criticalCount > 0 && (
        <span className="text-xs text-red-400 font-semibold">
          ⚠ {criticalCount}
        </span>
      )}
    </button>
  );
}

export { COMPETITOR_COLORS };
