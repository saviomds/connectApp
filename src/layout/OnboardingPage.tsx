'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, MapPin, Briefcase, User, Check, Lock, ShieldCheck, Crown, Loader2, Heart } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import VerificationRequestModal from '@/components/VerificationRequestModal';

const CATEGORIES = [
  { id: 'professional', label: 'Professional', emoji: '💼', desc: 'Career networking & growth', gated: true },
  { id: 'entrepreneur', label: 'Entrepreneur', emoji: '🚀', desc: 'Founders & investors',       gated: false },
  { id: 'creator',      label: 'Creator',      emoji: '🎨', desc: 'Artists, influencers, makers', gated: false },
  { id: 'young_youth',  label: 'Young Youth',  emoji: '⚡', desc: 'Students & young adults',    gated: false },
  { id: 'divorced',     label: 'New Chapter',  emoji: '🌿', desc: 'Starting fresh',             gated: true },
  { id: 'company',      label: 'Company',      emoji: '🏢', desc: 'Businesses & teams',         gated: false },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('');
  const [profession, setProfession] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lookingFor, setLookingFor] = useState('');

  const LOOKING_FOR_OPTIONS = [
    { id: 'relationship', label: 'Relationship', emoji: '❤️' },
    { id: 'dating',       label: 'Dating',        emoji: '🌹' },
    { id: 'friendship',   label: 'Friendship',    emoji: '🤝' },
    { id: 'networking',   label: 'Networking',    emoji: '💼' },
    { id: 'casual',       label: 'Casual',        emoji: '☕' },
    { id: 'not_sure',     label: 'Not sure yet',  emoji: '🤔' },
  ];
  const [gatedCategory, setGatedCategory] = useState<{ id: string; label: string } | null>(null);
  const [showVerif, setShowVerif] = useState(false);
  const [professionalLoading, setProfessionalLoading] = useState(false);

  const TOTAL_STEPS = 4;

  async function handleProfessionalPayment(catId: string) {
    setProfessionalLoading(true);
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: 'professional_monthly' }),
    });
    setProfessionalLoading(false);
    if (res.status === 401) { router.push('/login?next=/onboarding'); return; }
    const { url, error: err } = await res.json();
    if (err) { setError(err); return; }
    window.location.href = url;
  }

  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, profession, age, bio, city, country, looking_for: lookingFor || undefined }),
    });

    setLoading(false);

    if (!res.ok) {
      const { error: msg } = await res.json();
      setError(msg ?? 'Failed to save profile');
      return;
    }

    setDone(true);
  };

  if (done) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="fixed inset-0 -z-10">
        <Image src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1600&q=80" alt="" fill className="object-cover opacity-10" />
        <div className="absolute inset-0 hero-overlay" />
      </div>
      <div className="w-full max-w-md text-center">
        <div className="text-7xl mb-6 animate-bounce select-none">🎉</div>
        <h1 className="text-3xl font-bold text-white mb-3">You&apos;re all set!</h1>
        <p className="text-white/60 text-base mb-2">Your profile is live and ready.</p>
        <p className="text-white/40 text-sm mb-8">Start discovering people who match your vibe — swipe, connect, and grow.</p>
        <div className="flex flex-col gap-3">
          <a href="/discover"
            className="btn-gold h-13 px-8 py-3 rounded-2xl font-bold text-black text-lg flex items-center justify-center gap-2"
            style={{ fontSize: '1.05rem' }}>
            Start Discovering ✨
          </a>
          <a href="/profile" className="text-sm text-white/40 hover:text-white transition-colors">
            Review my profile first →
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="fixed inset-0 -z-10">
        <Image src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1600&q=80" alt="" fill className="object-cover opacity-10" />
        <div className="absolute inset-0 hero-overlay" />
      </div>

      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full transition-all"
              style={{ background: i < step ? '#C9A84C' : 'rgba(255,255,255,0.1)' }} />
          ))}
        </div>

        <div className="glass rounded-3xl p-5 sm:p-8">
          {error && (
            <div className="p-3 rounded-xl mb-4 text-sm text-red-400" style={{ background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.25)' }}>
              {error}
            </div>
          )}

          {step === 1 && (
            <>
              <h1 className="text-2xl font-bold text-white mb-1">Who are you here for?</h1>
              <p className="text-white/50 text-sm mb-6">We&apos;ll personalise your experience</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {CATEGORIES.map(({ id, label, emoji, desc, gated }) => (
                  <button key={id}
                    onClick={() => {
                      if (gated) { setGatedCategory({ id, label }); return; }
                      setCategory(id);
                    }}
                    className="relative p-4 rounded-2xl border text-left transition-all"
                    style={{
                      background: category === id ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.04)',
                      borderColor: category === id ? '#C9A84C' : 'rgba(255,255,255,0.08)',
                    }}>
                    {category === id && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                        <Check size={11} className="text-black" />
                      </div>
                    )}
                    {gated && category !== id && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(201,168,76,0.15)' }}>
                        <Lock size={9} style={{ color: '#C9A84C' }} />
                      </div>
                    )}
                    <div className="text-2xl mb-1">{emoji}</div>
                    <div className="text-sm font-semibold text-white">{label}</div>
                    <div className="text-xs text-white/40 mt-0.5">{desc}</div>
                    {gated && (
                      <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{ color: '#C9A84C' }}>Verified only</div>
                    )}
                  </button>
                ))}
              </div>
              <button onClick={() => category && setStep(2)} disabled={!category}
                className="btn-gold w-full h-12 rounded-xl font-semibold text-black flex items-center justify-center gap-2 disabled:opacity-40">
                Continue <ArrowRight size={16} />
              </button>

              {/* Gated category gate modal */}
              {gatedCategory && (
                <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center px-0 sm:px-4">
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setGatedCategory(null)} />
                  <div className="relative w-full sm:max-w-sm glass rounded-t-3xl sm:rounded-3xl p-6">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                      style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)' }}>
                      <Crown size={26} style={{ color: '#C9A84C' }} />
                    </div>
                    <h2 className="text-xl font-bold text-white text-center mb-2">
                      {gatedCategory.label} requires access
                    </h2>
                    <p className="text-sm text-white/55 text-center mb-5 leading-relaxed">
                      This category requires a <strong className="text-white">Professional Plan</strong> ($19.99/mo)
                      and identity verification. You'll get a verified badge and full professional networking access.
                    </p>
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => { setGatedCategory(null); handleProfessionalPayment(gatedCategory.id); }}
                        disabled={professionalLoading}
                        className="w-full h-12 rounded-xl font-bold text-black flex items-center justify-center gap-2 disabled:opacity-60"
                        style={{ background: '#C9A84C' }}>
                        {professionalLoading
                          ? <Loader2 size={16} className="animate-spin" />
                          : <><Crown size={15} /> Get Professional Plan — $19.99/mo</>}
                      </button>
                      <button
                        onClick={() => {
                          setCategory(gatedCategory.id);
                          setGatedCategory(null);
                          setShowVerif(true);
                        }}
                        className="w-full h-11 glass rounded-xl text-white/60 hover:text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                        <ShieldCheck size={14} /> Submit verification only (free)
                      </button>
                      <button onClick={() => setGatedCategory(null)}
                        className="text-sm text-white/30 hover:text-white/60 text-center transition-colors">
                        Choose a different category
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <AnimatePresence>
                {showVerif && gatedCategory && (
                  <VerificationRequestModal
                    category={gatedCategory.id}
                    categoryLabel={gatedCategory.label}
                    onClose={() => setShowVerif(false)}
                    onSubmitted={() => {
                      setShowVerif(false);
                      setStep(2);
                    }}
                  />
                )}
              </AnimatePresence>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-2xl font-bold text-white mb-1">About you</h1>
              <p className="text-white/50 text-sm mb-6">Tell us what you do</p>
              <div className="flex flex-col gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Profession *</label>
                  <div className="relative">
                    <Briefcase size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="e.g. Product Designer, Founder…"
                      className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Age * <span className="text-white/30 font-normal">(must be 18+)</span></label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input type="number" min={18} max={100} value={age}
                      onChange={(e) => { setAge(e.target.value); setError(''); }}
                      placeholder="Your age"
                      className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus" />
                  </div>
                  {age && parseInt(age) < 18 && (
                    <p className="text-xs text-red-400 mt-1.5">You must be at least 18 years old to use Vibro.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    <Heart size={13} className="inline mr-1.5 opacity-50" />
                    I&apos;m looking for <span className="text-white/30 font-normal">(optional)</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {LOOKING_FOR_OPTIONS.map(({ id, label, emoji }) => (
                      <button key={id} type="button"
                        onClick={() => setLookingFor(lookingFor === id ? '' : id)}
                        className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-all"
                        style={lookingFor === id
                          ? { background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', color: '#C9A84C' }
                          : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }
                        }>
                        <span className="text-base">{emoji}</span>{label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Bio</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short intro about yourself…" rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm resize-none input-focus" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="h-12 px-5 glass rounded-xl text-white/60 hover:text-white flex items-center gap-1.5 text-sm">
                  <ArrowLeft size={15} /> Back
                </button>
                <button
                  onClick={() => {
                    if (!profession || !age) return;
                    if (parseInt(age) < 18) { setError('You must be at least 18 years old to use Vibro.'); return; }
                    setStep(3);
                  }}
                  disabled={!profession || !age || parseInt(age) < 18}
                  className="btn-gold flex-1 h-12 rounded-xl font-semibold text-black flex items-center justify-center gap-2 disabled:opacity-40">
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="text-2xl font-bold text-white mb-1">Where are you based?</h1>
              <p className="text-white/50 text-sm mb-6">Help people nearby find you</p>
              <div className="flex flex-col gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">City *</label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="San Francisco"
                      className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Country</label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="United States"
                      className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="h-12 px-5 glass rounded-xl text-white/60 hover:text-white flex items-center gap-1.5 text-sm">
                  <ArrowLeft size={15} /> Back
                </button>
                <button onClick={() => city && setStep(4)} disabled={!city}
                  className="btn-gold flex-1 h-12 rounded-xl font-semibold text-black flex items-center justify-center gap-2 disabled:opacity-40">
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h1 className="text-2xl font-bold text-white mb-1">You&apos;re ready!</h1>
              <p className="text-white/50 text-sm mb-6">Here&apos;s a summary of your profile</p>
              <div className="glass rounded-2xl p-5 mb-6 flex flex-col gap-3">
                {[
                  { label: 'Category', value: CATEGORIES.find(c => c.id === category)?.label },
                  { label: 'Profession', value: profession },
                  { label: 'Age', value: age },
                  { label: 'Location', value: [city, country].filter(Boolean).join(', ') || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-white/40">{label}</span>
                    <span className="text-white font-medium">{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(3)} className="h-12 px-5 glass rounded-xl text-white/60 hover:text-white flex items-center gap-1.5 text-sm">
                  <ArrowLeft size={15} /> Back
                </button>
                <button onClick={handleSubmit} disabled={loading}
                  className="btn-gold flex-1 h-12 rounded-xl font-semibold text-black flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading
                    ? <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                    : <>Start Discovering <ArrowRight size={16} /></>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
