'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { RadarIcon, CommandIcon, AnalyticsIcon, DocumentIcon, GearIcon } from '@/components/icons';

const links = [
  { href: '/', label: 'Command', icon: CommandIcon },
  { href: '/stats', label: 'Analytics', icon: AnalyticsIcon },
  { href: '/digest', label: 'Intel', icon: DocumentIcon },
  { href: '/admin', label: 'Control', icon: GearIcon },
];

export function Nav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  // Don't show nav on login page
  if (pathname === '/login') {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800/60 bg-[#0b1120]/90 backdrop-blur-xl">
      {/* Subtle top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo & Nav */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/30 transition-shadow">
                  <RadarIcon className="w-5 h-5 text-slate-900" />
                </div>
                {/* Subtle glow effect */}
                <div className="absolute -inset-1 rounded-xl bg-amber-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold text-slate-100 leading-tight tracking-tight">RADAR</span>
                <span className="text-[10px] text-slate-500 leading-tight hidden sm:block font-medium tracking-wider uppercase">Competitive Intel</span>
              </div>
            </Link>

            {/* Nav Links */}
            <div className="flex gap-1">
              {links.map(link => {
                const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right: Status & User */}
          <div className="flex items-center gap-4">
            {/* Live Status Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="status-dot online pulse" />
              <span className="text-xs font-medium text-emerald-400">LIVE</span>
            </div>

            {user && (
              <div className="flex items-center gap-3">
                {/* User Email */}
                <div className="hidden md:flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                    {user.email?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="text-xs text-slate-500 truncate max-w-[120px]">
                    {user.email}
                  </span>
                </div>
                
                {/* Divider */}
                <div className="hidden md:block w-px h-6 bg-slate-800" />
                
                {/* Sign Out */}
                <button
                  onClick={signOut}
                  className="btn-ghost text-xs"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
