'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/reset-password`,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSuccess(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-nav">
      <div className="fixed inset-0 -z-10">
        <Image src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&q=60" alt="" fill className="object-cover opacity-10" />
        <div className="absolute inset-0 hero-overlay" />
      </div>

      <div className="w-full max-w-md animate-fade-up">
        <Link href="/login" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-8">
          <ArrowLeft size={18} /> Back to login
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)' }}>
            <Mail size={24} style={{ color: '#C9A84C' }} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Reset password</h1>
          <p className="text-white/50">Enter your email and we&apos;ll send a reset link</p>
        </div>

        <div className="glass rounded-3xl p-8">
          {success ? (
            <div className="text-center py-4">
              <CheckCircle size={48} className="mx-auto mb-4" style={{ color: '#2ECC71' }} />
              <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
              <p className="text-white/50 text-sm mb-6">We sent a reset link to <span className="text-white font-medium">{email}</span></p>
              <Link href="/login" className="btn-gold px-6 py-3 rounded-xl font-semibold text-black text-sm inline-block">
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="p-3 rounded-xl text-sm text-red-400" style={{ background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.25)' }}>
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Email address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@email.com" autoComplete="email"
                    className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="btn-gold h-12 rounded-xl font-semibold text-black flex items-center justify-center gap-2 disabled:opacity-60">
                {loading
                  ? <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                  : <>Send Reset Link <ArrowRight size={16} /></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
