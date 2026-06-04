'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/discover';

  const expired = params.get('expired') === '1'

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const email = fd.get('email') as string;
    const password = fd.get('password') as string;

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  };

  const handleOAuth = async (provider: 'google') => {
    // Store destination in a short-lived cookie that survives the OAuth round-trip.
    // Avoid embedding ?next= inside redirectTo — Supabase appends its own params
    // to that URL and the whitelist glob can fail when it already has a '?'.
    document.cookie = `oauth_next=${encodeURIComponent(next)}; path=/; max-age=300; samesite=lax${location.protocol === 'https:' ? '; secure' : ''}`
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/api/auth/callback` },
    });
  };

  return (
    <div className="w-full max-w-md animate-fade-up">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl shadow-gold mb-4" style={{ background: '#C9A84C' }}>
          <svg width="30" height="27" viewBox="0 0 20 18" fill="none" aria-hidden="true">
            <path d="M1.5 2C4 12 9 16 9 16C9 16 14 12 18.5 2" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="1.5" cy="2" r="1.5" fill="black"/>
            <circle cx="18.5" cy="2" r="1.5" fill="black"/>
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
        <p className="text-white/50">Sign in to continue your journey</p>
      </div>

      <div className="glass rounded-3xl p-5 sm:p-8">
        {expired && !error && (
          <div className="p-3 rounded-xl mb-4 text-sm text-amber-400 flex items-center gap-2"
            style={{ background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.25)' }}>
            <span>🔒</span> Your session expired. Please sign in again.
          </div>
        )}
        {error && (
          <div className="p-3 rounded-xl mb-4 text-sm text-red-400" style={{ background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.25)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Email address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input name="email" type="email" placeholder="you@email.com" required autoComplete="email"
                className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus transition-all" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-white/70">Password</label>
              <Link href="/forgot-password" className="text-xs font-medium" style={{ color: '#C9A84C' }}>Forgot password?</Link>
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input name="password" type={showPass ? 'text' : 'password'} placeholder="••••••••" required autoComplete="current-password"
                className="w-full h-12 pl-10 pr-10 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus transition-all" />
              <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="btn-gold mt-2 h-12 rounded-xl font-semibold text-black flex items-center justify-center gap-2 disabled:opacity-60 transition-all">
            {loading ? (
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (<>Sign In <ArrowRight size={16} /></>)}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-white/[0.08]" />
          <span className="text-xs text-white/30">or continue with</span>
          <div className="flex-1 h-px bg-white/[0.08]" />
        </div>

        <button
          onClick={() => handleOAuth('google')}
          disabled={loading}
          className="w-full h-12 rounded-xl flex items-center justify-center gap-3 font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: '#fff', color: '#1a1a1a' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
      </div>

      <p className="text-center text-sm text-white/40 mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-semibold transition-colors" style={{ color: '#C9A84C' }}>Sign up</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-nav">
      <div className="fixed inset-0 -z-10">
        <Image src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&q=60" alt="" fill className="object-cover opacity-10" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,10,11,0.7), #0A0A0B)' }} />
      </div>
      <Suspense fallback={<div className="text-white/50">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
