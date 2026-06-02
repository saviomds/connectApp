import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, MapPin, Settings, Crown, Plus, Briefcase, ShieldCheck, Clock, ShieldX } from 'lucide-react';
import { getCachedUser, createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProfilePageClient from '@/components/ProfilePageClient';
import VerificationGate from '@/components/VerificationGate';
import type { DbProfile } from '@/types/database';

export default async function ProfilePage() {
  const user = await getCachedUser();
  if (!user) redirect('/login');

  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    redirect('/onboarding');
  }

  const p = profile as DbProfile;
  const completion = p.profile_completion;

  return (
    <div className="min-h-screen pt-20 pb-24 md:pb-8 px-4">
      <div className="max-w-2xl mx-auto">

        <div className="relative mb-16">
          <div className="h-36 rounded-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(155,109,255,0.2), rgba(74,144,226,0.2))' }}>
            <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #C9A84C22, #9B6DFF22)' }} />
          </div>
          <div className="absolute -bottom-12 left-5">
            <div className="p-0.5 rounded-2xl" style={{ background: 'linear-gradient(135deg, #C9A84C, #E2C068)' }}>
              {p.avatar_url ? (
                <Image src={p.avatar_url} alt={p.full_name} width={80} height={80}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-[#0A0A0B]" />
              ) : (
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold border-2 border-[#0A0A0B]"
                  style={{ background: 'rgba(201,168,76,0.2)', color: '#C9A84C' }}>
                  {p.full_name.charAt(0)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-start justify-between mb-4 px-1">
          <div>
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{p.full_name}</h1>
              {p.is_verified && <BadgeCheck size={20} className="fill-blue-400 text-white" />}
              {p.is_premium && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-black" style={{ background: '#C9A84C' }}>
                  <Crown size={10} /> {p.premium_tier ?? 'Gold'}
                </span>
              )}
            </div>
            <p className="text-white/60 text-sm">{p.profession}{p.company ? ` · ${p.company}` : ''}</p>
            {p.city && (
              <div className="flex items-center gap-1 text-white/35 text-xs mt-1">
                <MapPin size={11} /> {[p.city, p.country].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/settings" className="glass w-9 h-9 rounded-xl flex items-center justify-center text-white/50 hover:text-white transition-colors">
              <Settings size={16} />
            </Link>
            <ProfilePageClient displayUser={{
              id: user.id,
              name: p.full_name,
              profession: p.profession ?? '',
              company: p.company ?? '',
              city: p.city ?? '',
              country: p.country ?? '',
              bio: p.bio ?? '',
              interests: p.interests,
              age: p.age ?? 0,
              category: p.category ?? 'professional',
              linkedin_url: p.linkedin_url ?? '',
              website: p.website ?? '',
              is_open_to_work: p.is_open_to_work,
              avatar_url: p.avatar_url ?? '',
              photos: p.photos ?? [],
            }} />
          </div>
        </div>

        <div className="glass rounded-2xl p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">Profile completion</span>
            <span className="text-sm font-bold" style={{ color: '#C9A84C' }}>{completion}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${completion}%`, background: 'linear-gradient(90deg, #C9A84C, #E2C068)' }} />
          </div>
          <p className="text-xs text-white/40 mt-2">
            {completion < 100 ? 'Complete your profile to get more matches' : '✨ Profile complete!'}
          </p>
        </div>

        {/* Verification status */}
        <VerificationGate
          status={p.verification_status ?? 'none'}
          category={p.category ?? null}
          isProfessional={p.is_professional ?? false}
        />

        {p.bio && (
          <div className="glass rounded-2xl p-5 mb-4">
            <h2 className="font-semibold text-white mb-2">About</h2>
            <p className="text-white/60 text-sm leading-relaxed">{p.bio}</p>
          </div>
        )}

        {p.interests.length > 0 && (
          <div className="glass rounded-2xl p-5 mb-4">
            <h2 className="font-semibold text-white mb-3">Interests</h2>
            <div className="flex flex-wrap gap-2">
              {p.interests.map((tag) => (
                <span key={tag} className="px-3 py-1.5 rounded-full text-sm font-medium bg-white/[0.07] border border-white/10 text-white/70">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {p.profession && (
          <div className="glass rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">Experience</h2>
              <button className="text-white/30 hover:text-white transition-colors"><Plus size={14} /></button>
            </div>
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                <Briefcase size={16} style={{ color: '#C9A84C' }} />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{p.profession}</p>
                {p.company && <p className="text-white/50 text-xs">{p.company}</p>}
                <p className="text-green-400 text-xs mt-0.5">· Current</p>
              </div>
            </div>
          </div>
        )}

        {!p.is_premium && (
          <Link href="/premium" className="block glass rounded-2xl p-5 border mb-4 relative overflow-hidden"
            style={{ borderColor: 'rgba(201,168,76,0.25)' }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.07), transparent)' }} />
            <div className="relative flex items-center gap-3">
              <Crown size={22} style={{ color: '#C9A84C' }} />
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">Upgrade to Premium</p>
                <p className="text-white/40 text-xs mt-0.5">See who liked you, boost visibility, unlimited likes</p>
              </div>
            </div>
          </Link>
        )}

        <Link href="/api/auth/logout" className="block w-full glass rounded-2xl p-4 text-white/50 hover:text-white text-sm font-medium transition-colors text-center border border-white/[0.06] hover:border-white/20">
          Sign out
        </Link>
      </div>
    </div>
  );
}
