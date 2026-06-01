'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, MapPin, Briefcase, User, Check } from 'lucide-react';

const CATEGORIES = [
  { id: 'professional', label: 'Professional', emoji: '💼', desc: 'Career networking & growth' },
  { id: 'entrepreneur', label: 'Entrepreneur', emoji: '🚀', desc: 'Founders & investors' },
  { id: 'creator',      label: 'Creator',      emoji: '🎨', desc: 'Artists, influencers, makers' },
  { id: 'young_youth',  label: 'Young Youth',  emoji: '⚡', desc: 'Students & young adults' },
  { id: 'divorced',     label: 'New Chapter',  emoji: '🌿', desc: 'Starting fresh' },
  { id: 'company',      label: 'Company',      emoji: '🏢', desc: 'Businesses & teams' },
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

  const TOTAL_STEPS = 4;

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, profession, age, bio, city, country }),
    });

    setLoading(false);

    if (!res.ok) {
      const { error: msg } = await res.json();
      setError(msg ?? 'Failed to save profile');
      return;
    }

    router.push('/discover');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="fixed inset-0 -z-10">
        <Image src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1600&q=80" alt="" fill className="object-cover opacity-10" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,10,11,0.7), #0A0A0B)' }} />
      </div>

      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full transition-all"
              style={{ background: i < step ? '#C9A84C' : 'rgba(255,255,255,0.1)' }} />
          ))}
        </div>

        <div className="glass rounded-3xl p-8">
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
                {CATEGORIES.map(({ id, label, emoji, desc }) => (
                  <button key={id} onClick={() => setCategory(id)}
                    className="relative p-4 rounded-2xl border text-left transition-all"
                    style={{ background: category === id ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.04)', borderColor: category === id ? '#C9A84C' : 'rgba(255,255,255,0.08)' }}>
                    {category === id && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                        <Check size={11} className="text-black" />
                      </div>
                    )}
                    <div className="text-2xl mb-1">{emoji}</div>
                    <div className="text-sm font-semibold text-white">{label}</div>
                    <div className="text-xs text-white/40 mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => category && setStep(2)} disabled={!category}
                className="btn-gold w-full h-12 rounded-xl font-semibold text-black flex items-center justify-center gap-2 disabled:opacity-40">
                Continue <ArrowRight size={16} />
              </button>
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
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Age *</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input type="number" min={18} max={100} value={age} onChange={(e) => setAge(e.target.value)} placeholder="Your age"
                      className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus" />
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
                <button onClick={() => profession && age && setStep(3)} disabled={!profession || !age}
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
