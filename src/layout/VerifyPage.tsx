'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, ArrowLeft, RotateCcw, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const CODE_LENGTH = 6;

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') || '';

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [countdown, setCountdown] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(CODE_LENGTH).fill(null));

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  const isFilled = code.every((c) => c !== '');

  const handleChange = (value: string, index: number) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length > 1) {
      const arr = digits.slice(0, CODE_LENGTH).split('');
      const next = Array(CODE_LENGTH).fill('');
      arr.forEach((d, i) => { next[i] = d; });
      setCode(next);
      inputRefs.current[Math.min(arr.length, CODE_LENGTH - 1)]?.focus();
      return;
    }
    const single = digits.slice(0, 1);
    const next = [...code];
    next[index] = single;
    setCode(next);
    if (single && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const next = [...code];
      next[index - 1] = '';
      setCode(next);
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleVerify = async () => {
    if (!isFilled) return;
    setError('');
    setLoading(true);

    const token = code.join('');
    const supabase = createClient();

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
      return;
    }

    router.push('/onboarding');
    router.refresh();
  };

  const handleResend = async () => {
    const supabase = createClient();
    await supabase.auth.resend({ type: 'signup', email });
    setCountdown(60);
    setCode(Array(CODE_LENGTH).fill(''));
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="w-full max-w-sm animate-fade-up">
      <Link href="/signup" className="inline-flex items-center gap-2 glass w-10 h-10 rounded-xl justify-center mb-8 text-white/50 hover:text-white transition-colors">
        <ArrowLeft size={18} />
      </Link>

      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)' }}>
          <Shield size={36} style={{ color: '#C9A84C' }} />
        </div>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Verify your email</h1>
        <p className="text-white/50 text-sm leading-relaxed">
          We sent a 6-digit code to<br />
          <span className="text-white/80 font-semibold">{email || 'your email'}</span>
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl mb-4 text-sm text-red-400 text-center" style={{ background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.25)' }}>
          {error}
        </div>
      )}

      <div className="flex items-center justify-center gap-2.5 mb-6">
        {Array(CODE_LENGTH).fill(0).map((_, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text" inputMode="numeric" pattern="[0-9]*" maxLength={CODE_LENGTH}
            value={code[i]}
            onChange={(e) => handleChange(e.target.value, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onFocus={(e) => e.target.select()}
            className="text-center font-bold text-xl text-white outline-none transition-all select-all"
            style={{
              width: 48, height: 56, flexShrink: 0, borderRadius: 14,
              background: code[i] ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.06)',
              border: `1.5px solid ${code[i] ? '#C9A84C' : 'rgba(255,255,255,0.1)'}`,
              boxShadow: code[i] ? '0 0 0 3px rgba(201,168,76,0.12)' : 'none',
              caretColor: '#C9A84C',
            }}
          />
        ))}
      </div>

      <div className="text-center mb-6">
        {countdown > 0 ? (
          <p className="text-sm text-white/40">Resend code in <span style={{ color: '#C9A84C' }}>{countdown}s</span></p>
        ) : (
          <button onClick={handleResend} className="flex items-center gap-1.5 text-sm font-semibold mx-auto hover:opacity-80 transition-opacity" style={{ color: '#C9A84C' }}>
            <RotateCcw size={14} /> Resend code
          </button>
        )}
      </div>

      <button onClick={handleVerify} disabled={!isFilled || loading}
        className="w-full h-12 rounded-xl font-semibold text-black flex items-center justify-center gap-2 transition-all disabled:opacity-40"
        style={{ background: '#C9A84C' }}>
        {loading ? (
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : 'Verify & Continue'}
      </button>

      <div className="flex items-center justify-center gap-1.5 mt-5">
        <Lock size={12} className="text-white/25" />
        <p className="text-xs text-white/25">Your data is encrypted and secure</p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16">
      <div className="fixed inset-0 -z-10">
        <Image src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&q=60" alt="" fill className="object-cover opacity-10" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,10,11,0.7), #0A0A0B)' }} />
      </div>
      <Suspense fallback={<div className="text-white/50">Loading…</div>}>
        <VerifyForm />
      </Suspense>
    </div>
  );
}
