'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Dashboard', icon: '📡' },
  { href: '/stats', label: 'Analytics', icon: '📊' },
  { href: '/admin', label: 'Admin', icon: '⚙️' },
];

export function Nav() {
  const pathname = usePathname();
  
  return (
    <nav className="bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-blue-500/20">
                R
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-100 leading-tight">Radar</span>
                <span className="text-[10px] text-slate-500 leading-tight hidden sm:block">Competitive Intel</span>
              </div>
            </Link>
            <div className="flex gap-1">
              {links.map(link => {
                const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
                return (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-slate-800 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="mr-1.5 text-xs">{link.icon}</span>
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
