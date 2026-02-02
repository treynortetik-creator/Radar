import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: 'Radar — Competitive Intelligence',
  description: 'SafelyYou competitive intelligence dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0b1120]">
        <Nav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-16">
          {children}
        </main>
      </body>
    </html>
  );
}
