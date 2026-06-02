'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, ArrowRight, UserCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/discover';

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

  const handleGuestLogin = async () => {
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInAnonymously();
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    router.push(next);
  };

  const handleOAuth = async (provider: 'google') => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/api/auth/callback?next=${encodeURIComponent(next)}` },
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

        <div className="grid grid-cols-1 gap-3">
          <button onClick={() => handleOAuth('google')}
            className="h-11 glass rounded-xl flex items-center justify-center gap-2 hover:bg-white/10 transition-colors text-sm font-medium text-white/70">
            <span className="font-bold text-sm" style={{ color: '#EA4335' }}>G</span> Continue with Google
          </button>
          <button onClick={handleGuestLogin}
            className="h-11 glass rounded-xl flex items-center justify-center gap-2 hover:bg-white/10 transition-colors text-sm font-medium text-white/70">
            <UserCircle size={18} /> Continue as Guest
          </button>
        </div>
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
    <div className="min-h-screen flex items-center justify-center px-4 pt-16">
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
