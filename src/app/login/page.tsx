'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { RadarSweepIcon, ShieldIcon } from '@/components/icons';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setError('Check your email for a confirmation link!');
        setLoading(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Radial gradient */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-amber-500/5 blur-3xl" />
        {/* Grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(51,65,85,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(51,65,85,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="card-base p-8 backdrop-blur-xl">
          {/* Top glow accent */}
          <div className="absolute -top-px left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
          
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="relative inline-flex items-center justify-center mb-5">
              {/* Outer glow ring */}
              <div className="absolute w-20 h-20 rounded-full bg-amber-500/10 animate-pulse" />
              {/* Logo container */}
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <RadarSweepIcon className="w-9 h-9 text-slate-900" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-slate-100 tracking-tight">RADAR</h1>
            <p className="text-sm text-slate-500 mt-2 font-medium">Competitive Intelligence Platform</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-base"
                placeholder="operator@company.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="input-base"
                placeholder="••••••••"
              />
            </div>

            {/* Error/Success message */}
            {error && (
              <div className={`
                flex items-center gap-2 p-3 rounded-lg text-sm
                ${error.includes('Check your email')
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }
              `}>
                <ShieldIcon 
                  variant={error.includes('Check your email') ? 'secure' : 'alert'} 
                  className="w-4 h-4 shrink-0" 
                />
                <span>{error}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <ShieldIcon variant="secure" className="w-4 h-4" />
                  <span>{mode === 'login' ? 'Access Command Center' : 'Create Account'}</span>
                </>
              )}
            </button>
          </form>

          {/* Mode toggle */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-sm text-slate-500 hover:text-amber-400 transition-colors"
            >
              {mode === 'login'
                ? "Don't have access? Request credentials"
                : 'Already have access? Sign in'}
            </button>
          </div>
        </div>

        {/* Security notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-600 flex items-center justify-center gap-1.5">
            <ShieldIcon variant="default" className="w-3.5 h-3.5" />
            Secure connection • Data encrypted in transit
          </p>
        </div>
      </div>
    </div>
  );
}
