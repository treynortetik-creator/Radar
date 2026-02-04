'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const PUBLIC_ROUTES = ['/login'];

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

      if (!user && !isPublicRoute) {
        router.push('/login');
      } else if (user && pathname === '/login') {
        router.push('/');
      }
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3">
        <div className="w-5 h-5 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
        <span className="text-sm text-slate-500">Loading...</span>
      </div>
    );
  }

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  // Require auth for protected routes
  if (!user) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
}
