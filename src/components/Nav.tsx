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
    <nav className="sticky top-0 z-50 border-b border-[#334023]/75 bg-[#090d08]/92 backdrop-blur-xl">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#dcc65e]/55 to-transparent" />

      <div className="max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-5">
        <div className="h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-5 min-w-0">
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-lg border border-[#6e8342] bg-[#12190f] flex items-center justify-center shadow-[0_0_20px_-12px_rgba(219,197,94,0.7)]">
                <RadarIcon className="w-5 h-5 text-[#dbc55e]" />
              </div>
              <div className="leading-tight">
                <div className="text-[15px] font-bold tracking-[0.24em] text-[#ece6b2]">RADAR</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#879266] hidden sm:block">Command Intel</div>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-1.5">
              {links.map(link => {
                const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href} className={`nav-link ${isActive ? 'active' : ''}`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-[#3f5128] bg-[#11170e]">
              <span className="status-dot online pulse" />
              <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#9eb76c]">Active Feed</span>
            </div>

            {user && (
              <>
                <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-[#3a4a25] bg-[#11170e]">
                  <div className="w-6 h-6 rounded-md border border-[#536735] bg-[#0c1209] flex items-center justify-center text-[10px] font-semibold text-[#c0c890]">
                    {user.email?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="text-[11px] text-[#8f9a6f] truncate max-w-[180px]">
                    {user.email}
                  </span>
                </div>
                <button onClick={signOut} className="btn-secondary text-[10px]">
                  Logout
                </button>
              </>
            )}
          </div>
        </div>

        <div className="md:hidden pb-3 flex gap-1.5 overflow-x-auto scrollbar-hide">
          {links.map(link => {
            const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href} className={`nav-link ${isActive ? 'active' : ''}`}>
                <Icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
