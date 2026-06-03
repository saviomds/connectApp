import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CheckCircle, Zap, Shield, Users, Briefcase, Heart, Star } from 'lucide-react';

const FEATURES = [
  { icon: Users,     title: 'Smart Discovery',    desc: 'AI-matched profiles based on goals, values, and interests — not just looks.' },
  { icon: Briefcase, title: 'Professional Mode',   desc: 'Switch between social and professional networking seamlessly in one app.' },
  { icon: Shield,    title: 'Verified Profiles',   desc: 'Company email and ID verification builds trust before the first hello.' },
  { icon: Heart,     title: 'Meaningful Matches',  desc: '30+ compatibility signals go beyond swipe culture to surface real connections.' },
  { icon: Zap,       title: 'Real-time Chat',      desc: 'Encrypted messaging with voice notes, reactions, and smart reply suggestions.' },
  { icon: Star,      title: 'Premium Access',      desc: 'Boost visibility, unlock unlimited likes, and see who viewed your profile.' },
];

const CATEGORIES = [
  { label: 'Professionals', emoji: '💼', gradient: 'from-blue-500/20 to-blue-500/5',    border: 'border-blue-500/20' },
  { label: 'Entrepreneurs', emoji: '🚀', gradient: 'from-rose-500/20 to-rose-500/5',    border: 'border-rose-500/20' },
  { label: 'Creators',      emoji: '🎨', gradient: 'from-purple-500/20 to-purple-500/5', border: 'border-purple-500/20' },
  { label: 'Young Youth',   emoji: '⚡', gradient: 'from-yellow-500/20 to-yellow-500/5', border: 'border-yellow-500/20' },
  { label: 'New Chapter',   emoji: '🌿', gradient: 'from-emerald-500/20 to-emerald-500/5', border: 'border-emerald-500/20' },
  { label: 'Companies',     emoji: '🏢', gradient: 'from-cyan-500/20 to-cyan-500/5',    border: 'border-cyan-500/20' },
];

const TESTIMONIALS = [
  {
    name: 'Sarah K.', role: 'Product Designer',
    text: 'Found my co-founder AND my partner on Vibro. The professional + personal blend is genius.',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80',
  },
  {
    name: 'Marcus R.', role: 'Serial Entrepreneur',
    text: 'Closed two deals through connections I made here. LinkedIn wishes it had this much energy.',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80',
  },
  {
    name: 'Amara O.', role: 'Creative Director',
    text: 'Finally an app that takes creators seriously. My whole creative network is here now.',
    photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&q=80',
  },
];

const AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=60&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&q=80',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=60&q=80',
];

export default function LandingPage() {
  return (
    <main className="pt-nav-flush">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden pt-16 pb-8 sm:pt-0 sm:pb-0">
        <div className="absolute inset-0">
          <Image src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1600&q=80" alt="" fill className="object-cover opacity-[0.18]" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0B]/60 via-[#0A0A0B]/80 to-[#0A0A0B]" />
        </div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: 'rgba(201,168,76,0.07)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl" style={{ background: 'rgba(155,109,255,0.07)' }} />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-sm font-medium mb-8 animate-fade-up" style={{ color: '#C9A84C' }}>
            <Zap size={14} style={{ fill: '#C9A84C', color: '#C9A84C' }} />
            The premium social discovery platform
          </div>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-white mb-6 animate-fade-up-delay-1 leading-tight">
            Discover Real<br />
            <span className="text-gradient-gold">Connections</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up-delay-2">
            Where professionals, creators, and entrepreneurs meet. Build your network, find your people,
            grow your career — or simply meet someone extraordinary.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up-delay-3">
            <Link href="/signup" className="btn-gold px-8 py-4 rounded-2xl font-semibold text-black text-base flex items-center gap-2 shadow-gold">
              Get Started Free <ArrowRight size={18} />
            </Link>
            <Link href="/discover" className="glass px-8 py-4 rounded-2xl font-semibold text-white text-base hover:bg-white/10 transition-colors flex items-center gap-2">
              Enter App <ArrowRight size={16} className="opacity-60" />
            </Link>
          </div>
          <div className="flex items-center justify-center gap-4 mt-12 animate-fade-up-delay-4">
            <div className="flex -space-x-2">
              {AVATARS.map((src, i) => (
                <Image key={i} src={src} alt="" width={32} height={32} className="w-8 h-8 rounded-full border-2 border-[#0A0A0B] object-cover" />
              ))}
            </div>
            <p className="text-sm text-white/50"><span className="text-white font-semibold">50,000+</span> professionals already connected</p>
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────── */}
      <section className="py-12 sm:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#C9A84C' }}>For Everyone</p>
            <h2 className="text-4xl font-bold text-white">Who is Vibro for?</h2>
            <p className="text-white/50 mt-3 text-lg">Six communities under one roof.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {CATEGORIES.map(({ label, emoji, gradient, border }) => (
              <Link key={label} href="/discover" className={`glass card-hover bg-gradient-to-br ${gradient} border ${border} rounded-2xl p-6 cursor-pointer`}>
                <div className="text-3xl mb-3">{emoji}</div>
                <h3 className="font-semibold text-white text-lg">{label}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="py-12 sm:py-24 px-4 sm:px-6" style={{ background: 'rgba(17,17,20,0.4)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#C9A84C' }}>Why Vibro</p>
            <h2 className="text-4xl font-bold text-white">Built differently, on purpose</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass card-hover rounded-2xl p-6">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                  <Icon size={20} style={{ color: '#C9A84C' }} />
                </div>
                <h3 className="font-semibold text-white text-lg mb-2">{title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────── */}
      <section className="py-12 sm:py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#C9A84C' }}>Stories</p>
            <h2 className="text-4xl font-bold text-white">Real connections. Real results.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, role, text, photo }) => (
              <div key={name} className="glass rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-white/70 text-sm leading-relaxed flex-1">&quot;{text}&quot;</p>
                <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
                  <Image src={photo} alt={name} width={36} height={36} className="w-9 h-9 rounded-full object-cover" />
                  <div>
                    <p className="text-white font-semibold text-sm">{name}</p>
                    <p className="text-white/40 text-xs">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-12 sm:py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass rounded-3xl p-6 sm:p-12 relative overflow-hidden" style={{ border: '1px solid rgba(201,168,76,0.15)' }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.05), transparent)' }} />
            <div className="relative z-10">
              <h2 className="text-4xl font-bold text-white mb-4">Ready to connect?</h2>
              <p className="text-white/50 text-lg mb-8">Join 50,000+ people who found their network, their next hire, or their person.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/signup" className="btn-gold px-8 py-4 rounded-2xl font-bold text-black text-base shadow-gold flex items-center gap-2">
                  Create Free Account <ArrowRight size={18} />
                </Link>
                <Link href="/premium" className="glass px-8 py-4 rounded-2xl font-semibold text-base hover:bg-white/10 transition-colors" style={{ color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}>
                  View Premium Plans
                </Link>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-white/40">
                {['No credit card required', 'Free forever plan', 'Cancel anytime'].map((t) => (
                  <div key={t} className="flex items-center gap-1.5">
                    <CheckCircle size={13} className="text-emerald-400" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#C9A84C' }}>
              <svg width="13" height="12" viewBox="0 0 20 18" fill="none" aria-hidden="true">
                <path d="M1.5 2C4 12 9 16 9 16C9 16 14 12 18.5 2" stroke="black" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="1.5" cy="2" r="1.8" fill="black"/>
                <circle cx="18.5" cy="2" r="1.8" fill="black"/>
              </svg>
            </div>
            <span className="text-white/50 text-sm">© 2025 Vibro. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/40">
            {['Privacy', 'Terms', 'Safety', 'Help'].map((l) => (
              <a key={l} href="#" className="hover:text-white/70 transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
