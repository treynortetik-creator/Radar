'use client';

import { useState, useEffect } from 'react';
import { ChevronIcon } from '@/components/icons';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  storageKey?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  subtitle,
  icon,
  defaultOpen = true,
  storageKey,
  headerRight,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(() => {
    if (storageKey && typeof window !== 'undefined') {
      const stored = localStorage.getItem(`section-${storageKey}`);
      if (stored !== null) return stored === 'true';
    }
    return defaultOpen;
  });

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(`section-${storageKey}`, String(isOpen));
    }
  }, [isOpen, storageKey]);

  return (
    <section className="card-base">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {headerRight}
          <ChevronIcon
            direction={isOpen ? 'up' : 'down'}
            className="w-5 h-5 text-slate-500 transition-transform duration-200"
          />
        </div>
      </button>
      {isOpen && (
        <div className="px-6 pb-6 animate-fade-in">
          {children}
        </div>
      )}
    </section>
  );
}
