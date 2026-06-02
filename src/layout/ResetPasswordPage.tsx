'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Supabase sends the tokens in the URL hash — the client SDK picks them up automatically
  useEffect(() => {
    const supabase = createClient();
    // Handle the session from the URL hash (PKCE flow)
    supabase.auth.getSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Minimum 6 characters'); return; }
    setLoading(true); setError('');

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push('/profile'), 1500);
  };

  if (success) {
    return (
      <div className="w-full max-w-md animate-fade-up text-center">
        <CheckCircle size={64} className="mx-auto mb-4" style={{ color: '#2ECC71' }} />
        <h2 className="text-2xl font-bold text-white mb-2">Password updated!</h2>
        <p className="text-white/50">Redirecting you to your profile…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md animate-fade-up">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)' }}>
          <Lock size={24} style={{ color: '#C9A84C' }} />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">New password</h1>
        <p className="text-white/50">Choose a strong password for your account</p>
      </div>

      <div className="glass rounded-3xl p-8">
        {error && (
          <div className="p-3 rounded-xl mb-4 text-sm text-red-400" style={{ background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.25)' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">New Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Min. 6 characters" autoComplete="new-password"
                className="w-full h-12 pl-10 pr-10 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus" />
              <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Confirm Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input type={showPass ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="Repeat password" autoComplete="new-password"
                className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus" />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="btn-gold h-12 rounded-xl font-semibold text-black flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg> : 'Set New Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-nav">
      <div className="fixed inset-0 -z-10">
        <Image src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&q=60" alt="" fill className="object-cover opacity-10" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,10,11,0.7), #0A0A0B)' }} />
      </div>
      <Suspense fallback={<div className="text-white/50">Loading…</div>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
