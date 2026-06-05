'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { createClient } from '@/lib/supabase/client';

const CATEGORIES = [
  { id: 'professional', label: 'Professional', emoji: '💼' },
  { id: 'entrepreneur', label: 'Entrepreneur', emoji: '🚀' },
  { id: 'creator',      label: 'Creator',      emoji: '🎨' },
  { id: 'young_youth',  label: 'Young Youth',  emoji: '⚡' },
  { id: 'divorced',     label: 'New Chapter',  emoji: '🌿' },
  { id: 'company',      label: 'Company',      emoji: '🏢' },
];

const GENDERS = [
  { id: 'male',              label: 'Man',              emoji: '👨' },
  { id: 'female',            label: 'Woman',            emoji: '👩' },
  { id: 'non_binary',        label: 'Non-binary',       emoji: '🌈' },
  { id: 'prefer_not_to_say', label: 'Prefer not to say', emoji: '🔒' },
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [gender, setGender] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ['', 'Weak', 'Good', 'Strong'];
  const strengthColor = ['', '#E74C3C', '#F39C12', '#2ECC71'];

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) { setStep(2); return; }
    handleSignup();
  };

  const handleSignup = async () => {
    if (!gender) { setError('Please select your gender'); return; }
    if (!category) { setError('Please select a category'); return; }
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, category, gender },
        emailRedirectTo: `${location.origin}/api/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // If 'Confirm email' is disabled in Supabase Auth settings, a session is returned immediately.
    if (data?.session) {
      router.push('/onboarding');
    } else {
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    }
  };

  const handleGoogleSignup = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/api/auth/callback` },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-nav pb-8">
      <div className="fixed inset-0 -z-10">
        <Image src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1200&q=60" alt="" fill className="object-cover opacity-10" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,10,11,0.7), #0A0A0B)' }} />
      </div>

      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl shadow-gold mb-4" style={{ background: '#C9A84C' }}>
            <svg width="30" height="27" viewBox="0 0 20 18" fill="none" aria-hidden="true">
              <path d="M1.5 2C4 12 9 16 9 16C9 16 14 12 18.5 2" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="1.5" cy="2" r="1.5" fill="black"/>
              <circle cx="18.5" cy="2" r="1.5" fill="black"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {step === 1 ? 'Create account' : 'Who are you here for?'}
          </h1>
          <p className="text-white/50">
            {step === 1 ? 'Join 50,000+ professionals' : "We'll personalise your experience"}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2].map((s) => (
            <div key={s} className="h-1.5 rounded-full transition-all" style={{ width: s === step ? 24 : 8, background: s <= step ? '#C9A84C' : 'rgba(255,255,255,0.15)' }} />
          ))}
        </div>

        <div className="glass rounded-3xl p-5 sm:p-8">
          {error && (
            <div className="p-3 rounded-xl mb-4 text-sm text-red-400" style={{ background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.25)' }}>
              {error}
            </div>
          )}
          <form onSubmit={handleNext} className="flex flex-col gap-4">
            {step === 1 ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Full name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Alex Chen" required autoComplete="name"
                      className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required autoComplete="email"
                      className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6} autoComplete="new-password"
                      className="w-full h-12 pl-10 pr-10 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus transition-all" />
                    <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 flex gap-1">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-1 flex-1 rounded-full transition-all" style={{ background: i <= strength ? strengthColor[strength] : 'rgba(255,255,255,0.1)' }} />
                        ))}
                      </div>
                      <span className="text-xs font-medium" style={{ color: strengthColor[strength] }}>{strengthLabel[strength]}</span>
                    </div>
                  )}
                </div>
                <button type="submit" className="btn-gold mt-2 h-12 rounded-xl font-semibold text-black flex items-center justify-center gap-2">
                  Continue <ArrowRight size={16} />
                </button>
              </>
            ) : (
              <>
                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">I am a…</label>
                  <div className="grid grid-cols-2 gap-2">
                    {GENDERS.map(({ id, label, emoji }) => (
                      <button key={id} type="button" onClick={() => setGender(id)}
                        className={clsx('relative p-3 rounded-2xl border text-left transition-all flex items-center gap-2', gender === id ? 'border-transparent shadow-gold' : 'border-white/10 hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.07]')}
                        style={gender === id ? { background: 'rgba(201,168,76,0.12)', borderColor: '#C9A84C' } : {}}>
                        {gender === id && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                            <Check size={9} className="text-black" />
                          </div>
                        )}
                        <span className="text-xl">{emoji}</span>
                        <span className="text-sm font-semibold text-white">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <label className="block text-sm font-medium text-white/70 -mb-1">I&apos;m here as a…</label>
                <div className="grid grid-cols-2 gap-3">
                  {CATEGORIES.map(({ id, label, emoji }) => (
                    <button key={id} type="button" onClick={() => setCategory(id)}
                      className={clsx('relative p-4 rounded-2xl border text-left transition-all', category === id ? 'border-transparent shadow-gold' : 'border-white/10 hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.07]')}
                      style={category === id ? { background: 'rgba(201,168,76,0.12)', borderColor: '#C9A84C' } : {}}>
                      {category === id && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                          <Check size={11} className="text-black" />
                        </div>
                      )}
                      <div className="text-2xl mb-2">{emoji}</div>
                      <div className="text-sm font-semibold text-white">{label}</div>
                    </button>
                  ))}
                </div>
                <button type="submit" disabled={!category || loading}
                  className="btn-gold mt-2 h-12 rounded-xl font-semibold text-black flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? (
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (<>Create Account <ArrowRight size={16} /></>)}
                </button>
              </>
            )}
          </form>

          {step === 1 && (
            <>
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-white/[0.08]" />
                <span className="text-xs text-white/30">or</span>
                <div className="flex-1 h-px bg-white/[0.08]" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignup}
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
                Sign up with Google
              </button>
            </>
          )}
        </div>

        <p className="text-center text-sm text-white/40 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold" style={{ color: '#C9A84C' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
