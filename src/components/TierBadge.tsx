'use client';

import { ShieldIcon } from '@/components/icons';

const tierConfig: Record<string, { 
  bg: string; 
  text: string; 
  border: string; 
  dot: string;
  glow?: string;
  shieldVariant: 'default' | 'alert' | 'secure';
}> = {
  Critical: { 
    bg: 'bg-red-500/15', 
    text: 'text-red-400', 
    border: 'border-red-500/30', 
    dot: 'bg-red-500',
    glow: 'shadow-[0_0_10px_-3px_rgba(239,68,68,0.5)]',
    shieldVariant: 'alert',
  },
  High: { 
    bg: 'bg-orange-500/15', 
    text: 'text-orange-400', 
    border: 'border-orange-500/30', 
    dot: 'bg-orange-500',
    shieldVariant: 'alert',
  },
  Medium: { 
    bg: 'bg-amber-500/15', 
    text: 'text-amber-400', 
    border: 'border-amber-500/30', 
    dot: 'bg-amber-500',
    shieldVariant: 'default',
  },
  Low: { 
    bg: 'bg-emerald-500/15', 
    text: 'text-emerald-400', 
    border: 'border-emerald-500/30', 
    dot: 'bg-emerald-500',
    shieldVariant: 'secure',
  },
};

interface TierBadgeProps {
  tier: string;
  size?: 'xs' | 'sm' | 'md';
  showIcon?: boolean;
}

export function TierBadge({ tier, size = 'sm', showIcon = false }: TierBadgeProps) {
  const config = tierConfig[tier] || { 
    bg: 'bg-slate-500/15', 
    text: 'text-slate-400', 
    border: 'border-slate-500/30', 
    dot: 'bg-slate-500',
    shieldVariant: 'default' as const,
  };
  
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px] gap-1',
    sm: 'px-2 py-0.5 text-xs gap-1.5',
    md: 'px-2.5 py-1 text-sm gap-2',
  };
  
  const dotSizes = {
    xs: 'w-1 h-1',
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
  };

  return (
    <span 
      className={`
        inline-flex items-center rounded-md font-semibold border uppercase tracking-[0.08em]
        ${config.bg} ${config.text} ${config.border} ${sizeClasses[size]} ${config.glow || ''}
      `}
    >
      {showIcon ? (
        <ShieldIcon variant={config.shieldVariant} className={size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      ) : (
        <span 
          className={`
            rounded-full ${config.dot} ${dotSizes[size]}
            ${tier === 'Critical' ? 'animate-pulse' : ''}
          `} 
        />
      )}
      {tier}
    </span>
  );
}

// Mini version for compact displays
export function TierDot({ tier, size = 'sm' }: { tier: string; size?: 'xs' | 'sm' | 'md' }) {
  const config = tierConfig[tier] || { dot: 'bg-slate-500' };
  const sizeClasses = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
  };
  
  return (
    <span 
      className={`
        inline-block rounded-full ${config.dot} ${sizeClasses[size]}
        ${tier === 'Critical' ? 'animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]' : ''}
      `}
      title={tier}
    />
  );
}

// For showing threat level as a visual bar
export function ThreatBar({ level, max = 3 }: { level: number; max?: number }) {
  const colors = ['bg-emerald-500', 'bg-amber-500', 'bg-orange-500', 'bg-red-500'];
  const color = colors[Math.min(level, colors.length - 1)];
  
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <div 
          key={i}
          className={`
            w-2 h-3 rounded-sm transition-all duration-300
            ${i < level ? color : 'bg-[#2a341f]'}
          `}
        />
      ))}
    </div>
  );
}
