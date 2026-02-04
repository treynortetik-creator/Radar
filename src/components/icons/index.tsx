// Custom tactical/intel-themed SVG icons for Radar

export function RadarSweepIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <path d="M12 2V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="2s"
          repeatCount="indefinite"
        />
      </path>
      <circle cx="12" cy="12" r="10" stroke="url(#radarGradient)" strokeWidth="2" strokeDasharray="4 4" strokeOpacity="0.3" />
      <defs>
        <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function RadarIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <path d="M12 3V12L18 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ThreatIcon({ level = 1, className = "w-4 h-4" }: { level?: number; className?: string }) {
  const colors = ['#22c55e', '#eab308', '#f97316', '#ef4444'];
  const color = colors[Math.min(level, 3)];
  
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path 
        d="M12 2L22 20H2L12 2Z" 
        fill={`${color}20`}
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {level >= 2 && (
        <path d="M12 9V13" stroke={color} strokeWidth="2" strokeLinecap="round" />
      )}
      {level >= 1 && (
        <circle cx="12" cy="16" r="1" fill={color} />
      )}
    </svg>
  );
}

export function SignalIcon({ strength = 3, className = "w-4 h-4" }: { strength?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="2" y="16" width="4" height="6" rx="1" fill={strength >= 1 ? 'currentColor' : 'currentColor'} fillOpacity={strength >= 1 ? 1 : 0.2} />
      <rect x="8" y="12" width="4" height="10" rx="1" fill={strength >= 2 ? 'currentColor' : 'currentColor'} fillOpacity={strength >= 2 ? 1 : 0.2} />
      <rect x="14" y="8" width="4" height="14" rx="1" fill={strength >= 3 ? 'currentColor' : 'currentColor'} fillOpacity={strength >= 3 ? 1 : 0.2} />
      <rect x="20" y="4" width="4" height="18" rx="1" fill={strength >= 4 ? 'currentColor' : 'currentColor'} fillOpacity={strength >= 4 ? 1 : 0.2} />
    </svg>
  );
}

export function TargetIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <path d="M12 2V5M12 19V22M2 12H5M19 12H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ShieldIcon({ variant = 'default', className = "w-5 h-5" }: { variant?: 'default' | 'alert' | 'secure'; className?: string }) {
  const colors = {
    default: { fill: '#64748b20', stroke: '#64748b' },
    alert: { fill: '#ef444420', stroke: '#ef4444' },
    secure: { fill: '#22c55e20', stroke: '#22c55e' },
  };
  const { fill, stroke } = colors[variant];
  
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path 
        d="M12 2L4 6V12C4 16.4183 7.58172 21 12 22C16.4183 21 20 16.4183 20 12V6L12 2Z" 
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {variant === 'secure' && (
        <path d="M9 12L11 14L15 10" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {variant === 'alert' && (
        <>
          <path d="M12 9V12" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="15" r="1" fill={stroke} />
        </>
      )}
    </svg>
  );
}

export function CommandIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="3" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IntelIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 20C4 16.6863 7.58172 14 12 14C16.4183 14 20 16.6863 20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="18" cy="5" r="3" fill="#ef4444" stroke="currentColor" strokeWidth="1" />
      <text x="18" y="7" textAnchor="middle" fill="white" fontSize="5" fontWeight="bold">!</text>
    </svg>
  );
}

export function AnalyticsIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 3V21H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 14L11 10L15 14L21 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7" cy="14" r="1.5" fill="currentColor" />
      <circle cx="11" cy="10" r="1.5" fill="currentColor" />
      <circle cx="15" cy="14" r="1.5" fill="currentColor" />
      <circle cx="21" cy="8" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function GearIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path 
        d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
      />
    </svg>
  );
}

export function AlertBellIcon({ hasAlert = false, className = "w-5 h-5" }: { hasAlert?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path 
        d="M18 8A6 6 0 106 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinejoin="round"
      />
      <path d="M13.73 21C13.37 21.54 12.74 22 12 22C11.26 22 10.63 21.54 10.27 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {hasAlert && (
        <circle cx="18" cy="5" r="4" fill="#ef4444" stroke="#0b1120" strokeWidth="1.5" />
      )}
    </svg>
  );
}

export function ExternalLinkIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M18 13V19C18 20.1 17.1 21 16 21H5C3.9 21 3 20.1 3 19V8C3 6.9 3.9 6 5 6H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 3H21V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 14L21 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronIcon({ direction = 'down', className = "w-4 h-4" }: { direction?: 'up' | 'down' | 'left' | 'right'; className?: string }) {
  const rotations = { up: 180, down: 0, left: 90, right: -90 };
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={{ transform: `rotate(${rotations[direction]}deg)` }}>
      <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M21 21L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function FilterIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 4H21L14 12V19L10 21V12L3 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function PlayIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M8 5V19L19 12L8 5Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function TrashIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 6H5H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M19 6L18 20C18 20.5523 17.5523 21 17 21H7C6.44772 21 6 20.5523 6 20L5 6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 11V16M14 11V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function EditIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M11 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H19C19.5523 21 20 20.5523 20 20V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function ClockIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7V12L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Animated loading radar
export function LoadingRadar({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 50 50" className={className}>
      <circle cx="25" cy="25" r="20" stroke="currentColor" strokeWidth="1" strokeOpacity="0.2" fill="none" />
      <circle cx="25" cy="25" r="14" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" fill="none" />
      <circle cx="25" cy="25" r="8" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" fill="none" />
      <circle cx="25" cy="25" r="2" fill="currentColor" fillOpacity="0.6" />
      <path d="M25 5 A20 20 0 0 1 45 25" stroke="url(#loadingGradient)" strokeWidth="2" strokeLinecap="round" fill="none">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 25 25"
          to="360 25 25"
          dur="1.5s"
          repeatCount="indefinite"
        />
      </path>
      <defs>
        <linearGradient id="loadingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
    </svg>
  );
}
