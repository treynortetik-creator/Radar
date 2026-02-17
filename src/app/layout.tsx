import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';
import { AuthProvider } from '@/lib/auth';
import { AuthGuard } from '@/components/AuthGuard';

export const metadata: Metadata = {
  title: 'Radar — Competitive Intelligence',
  description: 'SafelyYou competitive intelligence dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <Nav />
          <main className="max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-5 py-4 pb-12">
            <AuthGuard>
              {children}
            </AuthGuard>
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
