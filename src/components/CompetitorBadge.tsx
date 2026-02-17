'use client';

// Competitor brand colors with enhanced visibility
const COMPETITOR_COLORS: Record<string, { primary: string; secondary: string }> = {
  'Inspiren': { primary: '#CC4125', secondary: '#ff5a3c' },
  'Sage': { primary: '#B4A7D6', secondary: '#c9bfe6' },
  'VirtuSense': { primary: '#9900FF', secondary: '#b84dff' },
  'Amba': { primary: '#FF9900', secondary: '#ffb333' },
  'Nobi': { primary: '#B7E1CD', secondary: '#d0eedf' },
  'CarePredict': { primary: '#F9CB9C', secondary: '#fce0bf' },
};

export function CompetitorBadge({ 
  competitor, 
  showDot = true,
  size = 'sm',
}: { 
  competitor: string; 
  showDot?: boolean;
  size?: 'xs' | 'sm' | 'md';
}) {
  const colors = COMPETITOR_COLORS[competitor] || { primary: '#7f9152', secondary: '#c1cb8e' };
  
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px] gap-1',
    sm: 'px-2 py-0.5 text-[11px] gap-1.5',
    md: 'px-2.5 py-1 text-xs gap-2',
  };
  
  const dotSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
  };

  return (
    <span 
      className={`inline-flex items-center rounded-md font-semibold uppercase tracking-[0.08em] border transition-all duration-150 ${sizeClasses[size]}`}
      style={{ 
        backgroundColor: `${colors.primary}14`, 
        color: colors.secondary,
        borderColor: `${colors.primary}40`,
      }}
    >
      {showDot && (
        <span 
          className={`rounded-full shrink-0 ${dotSizes[size]}`} 
          style={{ backgroundColor: colors.primary }} 
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
  const colors = COMPETITOR_COLORS[competitor] || { primary: '#7f9152', secondary: '#c1cb8e' };
  
  return (
    <button 
      onClick={onClick}
      className={`
        group relative inline-flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold 
        uppercase tracking-[0.08em] transition-all duration-200 border overflow-hidden
        ${isActive 
          ? 'shadow-[0_0_24px_-14px_rgba(219,197,94,0.9)]' 
          : 'hover:translate-y-[-1px]'
        }
      `}
      style={{ 
        backgroundColor: isActive ? `${colors.primary}1e` : `${colors.primary}0d`, 
        borderColor: isActive ? `${colors.primary}58` : `${colors.primary}2f`,
        color: colors.secondary,
        boxShadow: isActive ? `inset 0 0 0 1px ${colors.primary}2f` : undefined,
      }}
    >
      {/* Subtle gradient overlay */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}10 0%, transparent 60%)`,
        }}
      />
      
      {/* Content */}
      <div className="relative flex items-center gap-2.5">
        {/* Competitor indicator */}
        <div 
          className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-[#2f3b22]"
          style={{ backgroundColor: colors.primary }} 
        />
        
        {/* Name */}
        <span className="font-semibold">{competitor}</span>
        
        {/* Count badge */}
        <span 
          className="text-xs font-bold px-2 py-0.5 rounded-md"
          style={{ 
            backgroundColor: `${colors.primary}26`,
            color: colors.secondary,
          }}
        >
          {count}
        </span>
        
        {/* Critical alert */}
        {criticalCount > 0 && (
          <span className="flex items-center gap-1 text-xs font-bold text-red-400 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            {criticalCount}
          </span>
        )}
      </div>
    </button>
  );
}

// Avatar-style competitor icon for headers
export function CompetitorAvatar({ 
  competitor, 
  size = 'md',
}: { 
  competitor: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const colors = COMPETITOR_COLORS[competitor] || { primary: '#7f9152', secondary: '#c1cb8e' };
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-lg',
  };
  
  return (
    <div 
      className={`${sizeClasses[size]} rounded-lg flex items-center justify-center font-bold shadow-lg border`}
      style={{ 
        backgroundColor: `${colors.primary}22`,
        color: colors.secondary,
        borderColor: `${colors.primary}42`,
        boxShadow: `0 8px 18px -12px ${colors.primary}56`,
      }}
    >
      {competitor[0]}
    </div>
  );
}

export { COMPETITOR_COLORS };
