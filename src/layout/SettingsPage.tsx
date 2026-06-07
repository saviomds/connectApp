'use client';

import { useState, useEffect, useCallback } from 'react';
import type React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft, Lock, Bell, Shield, Trash2, LogOut,
  ChevronRight, Eye, EyeOff, CheckCircle, ShieldCheck, Loader2,
  Sun, Moon, MapPin, Users, Zap, BookOpen,
  HelpCircle, FileText, ScrollText, Scale, ExternalLink, Phone,
} from 'lucide-react';

interface Prefs {
  notify_matches:        boolean
  notify_messages:       boolean
  show_read_receipts:    boolean
  notify_sms:            boolean
  free_tonight:          boolean
  show_gender:           'everyone' | 'men' | 'women'
  discovery_city:        string
  discovery_country:     string
}

const DEFAULT_PREFS: Prefs = {
  notify_matches: true, notify_messages: true, show_read_receipts: true,
  notify_sms: false, free_tonight: false,
  show_gender: 'everyone', discovery_city: '', discovery_country: '',
}

type Section = 'main' | 'password' | 'delete' | 'location'

// ── Theme hook ─────────────────────────────────────────────────────
function useTheme() {
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');
  useEffect(() => {
    const t = (localStorage.getItem('vibro_theme') ?? 'dark') as 'dark' | 'light';
    setThemeState(t);
  }, []);
  const setTheme = useCallback((next: 'dark' | 'light') => {
    setThemeState(next);
    localStorage.setItem('vibro_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  }, []);
  return { theme, setTheme };
}

export default function SettingsPage({ isAdmin = false }: { isAdmin?: boolean }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [section, setSection]           = useState<Section>('main');
  const [newPass, setNewPass]           = useState('');
  const [confirmPass, setConfirmPass]   = useState('');
  const [showPass, setShowPass]         = useState(false);
  const [passSuccess, setPassSuccess]   = useState(false);
  const [passError, setPassError]       = useState('');
  const [passSaving, setPassSaving]     = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting]         = useState(false);

  const [prefs, setPrefs]               = useState<Prefs>(DEFAULT_PREFS);
  const [prefsLoaded, setPrefsLoaded]   = useState(false);
  const [savingPref, setSavingPref]     = useState<string | null>(null);

  const [locationCity, setLocationCity]       = useState('');
  const [locationCountry, setLocationCountry] = useState('');

  useEffect(() => {
    fetch('/api/settings/preferences')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setPrefs({ ...DEFAULT_PREFS, ...d });
          setLocationCity(d.discovery_city ?? '');
          setLocationCountry(d.discovery_country ?? '');
          setPrefsLoaded(true);
        }
      })
      .catch(() => { setPrefsLoaded(true); });
  }, []);

  async function togglePref(key: keyof Prefs) {
    if (typeof prefs[key] !== 'boolean') return;
    const newVal = !prefs[key];
    setPrefs(p => ({ ...p, [key]: newVal }));
    setSavingPref(key);
    await fetch('/api/settings/preferences', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: newVal }),
    });
    setSavingPref(null);
  }

  async function setGenderPref(val: Prefs['show_gender']) {
    setPrefs(p => ({ ...p, show_gender: val }));
    setSavingPref('show_gender');
    await fetch('/api/settings/preferences', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ show_gender: val }),
    });
    setSavingPref(null);
  }

  async function saveLocation() {
    setSavingPref('location');
    await fetch('/api/settings/preferences', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discovery_city: locationCity, discovery_country: locationCountry }),
    });
    setPrefs(p => ({ ...p, discovery_city: locationCity, discovery_country: locationCountry }));
    setSavingPref(null);
    setSection('main');
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    if (newPass !== confirmPass) { setPassError('Passwords do not match'); return; }
    if (newPass.length < 6) { setPassError('Minimum 6 characters'); return; }
    setPassSaving(true);
    // Use the browser client so the session stays in sync after the update.
    // A server-side updateUser would set new cookies but leave the in-memory
    // session stale, triggering a SIGNED_OUT event on the client.
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setPassSaving(false);
    if (error) { setPassError(error.message ?? 'Failed'); return; }
    setPassSuccess(true); setNewPass(''); setConfirmPass('');
    setTimeout(() => setPassSuccess(false), 3000);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    await fetch('/api/settings/account', { method: 'DELETE' });
    router.push('/login');
  };

  const handleLogout = async () => {
    // Use the server-side route so cookies are cleared server-side.
    // Calling supabase.auth.signOut() here fires a client SIGNED_OUT event
    // that SessionGuard catches on this protected route, causing a double/race redirect.
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    router.push('/login')
  };

  // ── Toggle component ──────────────────────────────────────────
  function Toggle({ prefKey }: { prefKey: keyof Prefs }) {
    const on = !!prefs[prefKey];
    const busy = savingPref === prefKey;
    return (
      <button onClick={() => togglePref(prefKey)} disabled={!prefsLoaded || busy}
        className="relative w-11 h-6 rounded-full transition-all duration-300 disabled:opacity-50 shrink-0"
        style={{ background: on ? '#C9A84C' : 'rgba(255,255,255,0.1)' }}>
        {busy
          ? <Loader2 size={10} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-white/60" />
          : <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300"
              style={{ left: on ? '1.375rem' : '0.125rem' }} />}
      </button>
    );
  }

  // ── Password section ──────────────────────────────────────────
  if (section === 'password') return (
    <div className="min-h-screen pt-nav pb-nav-bottom px-4">
      <div className="max-w-lg mx-auto">
        <button onClick={() => setSection('main')} className="flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={18} /> Back
        </button>
        <h1 className="text-2xl font-bold text-white mb-6">Change Password</h1>
        <div className="glass rounded-2xl p-6">
          {passSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-xl mb-4 text-sm" style={{ background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.25)', color: '#2ECC71' }}>
              <CheckCircle size={15} /> Password updated successfully
            </div>
          )}
          {passError && (
            <div className="p-3 rounded-xl mb-4 text-sm text-red-400" style={{ background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.25)' }}>
              {passError}
            </div>
          )}
          <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">New Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={newPass} onChange={e => setNewPass(e.target.value)}
                  required minLength={6} placeholder="Min. 6 characters" autoComplete="new-password"
                  className="w-full h-12 px-4 pr-10 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus" />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Confirm Password</label>
              <input type={showPass ? 'text' : 'password'} value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                required placeholder="Repeat password" autoComplete="new-password"
                className="w-full h-12 px-4 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus" />
            </div>
            <button type="submit" disabled={passSaving}
              className="btn-gold h-12 rounded-xl font-semibold text-black flex items-center justify-center gap-2 disabled:opacity-60">
              {passSaving ? <Loader2 size={16} className="animate-spin" /> : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  // ── Location section ──────────────────────────────────────────
  if (section === 'location') return (
    <div className="min-h-screen pt-nav pb-nav-bottom px-4">
      <div className="max-w-lg mx-auto">
        <button onClick={() => setSection('main')} className="flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={18} /> Back
        </button>
        <h1 className="text-2xl font-bold text-white mb-2">Discovery Location</h1>
        <p className="text-sm text-white/50 mb-6">Set a different location to find matches anywhere in the world.</p>
        <div className="glass rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">City</label>
            <input value={locationCity} onChange={e => setLocationCity(e.target.value)}
              placeholder="e.g. Paris, New York, Lagos…"
              className="w-full h-12 px-4 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Country</label>
            <input value={locationCountry} onChange={e => setLocationCountry(e.target.value)}
              placeholder="e.g. France, USA, Nigeria…"
              className="w-full h-12 px-4 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus" />
          </div>
          <button onClick={saveLocation} disabled={savingPref === 'location'}
            className="btn-gold h-12 rounded-xl font-semibold text-black flex items-center justify-center gap-2 disabled:opacity-60">
            {savingPref === 'location' ? <Loader2 size={16} className="animate-spin" /> : 'Save Location'}
          </button>
          {(prefs.discovery_city || prefs.discovery_country) && (
            <button onClick={async () => {
              setLocationCity(''); setLocationCountry('');
              await fetch('/api/settings/preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ discovery_city: '', discovery_country: '' }) });
              setPrefs(p => ({ ...p, discovery_city: '', discovery_country: '' }));
              setSection('main');
            }} className="text-sm text-white/40 hover:text-red-400 transition-colors text-center">
              Reset to my actual location
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ── Delete section ────────────────────────────────────────────
  if (section === 'delete') return (
    <div className="min-h-screen pt-nav pb-nav-bottom px-4">
      <div className="max-w-lg mx-auto">
        <button onClick={() => setSection('main')} className="flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={18} /> Back
        </button>
        <h1 className="text-2xl font-bold text-white mb-2">Delete Account</h1>
        <p className="text-white/40 mb-6 text-sm">This is permanent and cannot be undone.</p>
        <div className="glass rounded-2xl p-6 border border-red-500/20">
          <p className="text-sm text-white/60 mb-4">
            Type <span className="text-red-400 font-mono font-bold">DELETE</span> to confirm:
          </p>
          <input type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="DELETE"
            className="w-full h-12 px-4 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm mb-4 input-focus" />
          <button onClick={handleDeleteAccount} disabled={deleteConfirm !== 'DELETE' || deleting}
            className="w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-30 transition-colors"
            style={{ background: deleteConfirm === 'DELETE' ? '#E74C3C' : 'rgba(231,76,60,0.2)' }}>
            {deleting ? <Loader2 size={16} className="animate-spin" /> : <><Trash2 size={16} /> Delete My Account</>}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Main section ──────────────────────────────────────────────
  const locationLabel = prefs.discovery_city
    ? `${prefs.discovery_city}${prefs.discovery_country ? `, ${prefs.discovery_country}` : ''}`
    : 'My current location';

  return (
    <div className="min-h-screen pt-nav pb-nav-bottom px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/profile" className="text-white/50 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
        </div>

        <div className="flex flex-col gap-4">

          {/* ── Account ── */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-2 px-1">Account</p>
            <div className="glass rounded-2xl overflow-hidden">
              <button onClick={() => setSection('password')}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors border-b border-white/[0.05]">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/[0.06]">
                  <Lock size={16} className="text-white/50" />
                </span>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white">Change Password</p>
                  <p className="text-xs text-white/35 mt-0.5">Update your account password</p>
                </div>
                <ChevronRight size={16} className="text-white/30 shrink-0" />
              </button>
              {/* Free Tonight */}
              <div className="flex items-center gap-4 px-5 py-4">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(46,204,113,0.12)' }}>
                  <Zap size={16} style={{ color: '#2ECC71' }} />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Free Tonight</p>
                  <p className="text-xs text-white/35 mt-0.5">Show others you&apos;re available to meet up</p>
                </div>
                <Toggle prefKey="free_tonight" />
              </div>
            </div>
          </section>

          {/* ── Appearance ── */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-2 px-1">Appearance</p>
            <div className="glass rounded-2xl overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/[0.06]">
                  {theme === 'dark' ? <Moon size={16} className="text-white/50" /> : <Sun size={16} style={{ color: '#C9A84C' }} />}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Theme</p>
                  <p className="text-xs text-white/35 mt-0.5">{theme === 'dark' ? 'Dark mode active' : 'Light mode active'}</p>
                </div>
                <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.06]">
                  {(['dark', 'light'] as const).map(t => (
                    <button key={t} onClick={() => setTheme(t)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={theme === t
                        ? { background: '#C9A84C', color: '#000' }
                        : { color: 'rgba(255,255,255,0.45)' }}>
                      {t === 'dark' ? '🌙 Dark' : '☀️ Light'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── Notifications ── */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-2 px-1">Notifications</p>
            <div className="glass rounded-2xl overflow-hidden divide-y divide-white/[0.05]">
              {([
                { key: 'notify_matches'  as const, label: 'Match alerts',   sub: 'Get notified when you match', icon: <Shield size={16} className="text-white/50" /> },
                { key: 'notify_messages' as const, label: 'Message alerts', sub: 'Get notified for new messages', icon: <Bell size={16} className="text-white/50" /> },
                { key: 'notify_sms'      as const, label: 'Transactional SMS', sub: 'Receive text messages for important updates', icon: <Phone size={16} className="text-white/50" /> },
              ]).map(({ key, label, sub, icon }) => (
                <div key={key} className="flex items-center gap-4 px-5 py-4">
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/[0.06]">{icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="text-xs text-white/35 mt-0.5">{sub}</p>
                  </div>
                  <Toggle prefKey={key} />
                </div>
              ))}
            </div>
          </section>

          {/* ── Discovery ── */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-2 px-1">Discovery</p>
            <div className="glass rounded-2xl overflow-hidden divide-y divide-white/[0.05]">
              {/* Location */}
              <button onClick={() => setSection('location')}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/[0.06]">
                  <MapPin size={16} className="text-white/50" />
                </span>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white">Discovery Location</p>
                  <p className="text-xs text-white/35 mt-0.5 truncate max-w-[200px]">{locationLabel}</p>
                </div>
                <ChevronRight size={16} className="text-white/30 shrink-0" />
              </button>
              {/* Show me */}
              <div className="flex items-center gap-4 px-5 py-4">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/[0.06]">
                  <Users size={16} className="text-white/50" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Show Me</p>
                  <p className="text-xs text-white/35 mt-0.5">Who you want to discover</p>
                </div>
                {savingPref === 'show_gender'
                  ? <Loader2 size={14} className="animate-spin text-white/30 shrink-0" />
                  : (
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.06]">
                      {(['everyone', 'women', 'men'] as const).map(g => (
                        <button key={g} onClick={() => setGenderPref(g)} disabled={!prefsLoaded}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all"
                          style={prefs.show_gender === g
                            ? { background: '#C9A84C', color: '#000' }
                            : { color: 'rgba(255,255,255,0.40)' }}>
                          {g}
                        </button>
                      ))}
                    </div>
                  )
                }
              </div>
            </div>
          </section>

          {/* ── Privacy ── */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-2 px-1">Privacy</p>
            <div className="glass rounded-2xl overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/[0.06]">
                  <Eye size={16} className="text-white/50" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Read Receipts</p>
                  <p className="text-xs text-white/35 mt-0.5">Show when you&apos;ve read messages</p>
                </div>
                <Toggle prefKey="show_read_receipts" />
              </div>
            </div>
          </section>

          {/* ── Help & Support ── */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-2 px-1">Support</p>
            <div className="glass rounded-2xl overflow-hidden divide-y divide-white/[0.05]">
              <Link href="/help"
                className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/[0.06]">
                  <HelpCircle size={16} className="text-white/50" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Help &amp; Support</p>
                  <p className="text-xs text-white/35 mt-0.5">FAQs, contact us, report issues</p>
                </div>
                <ChevronRight size={16} className="text-white/30 shrink-0" />
              </Link>
              <Link href="/community-guidelines"
                className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/[0.06]">
                  <Shield size={16} className="text-white/50" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Community Guidelines</p>
                  <p className="text-xs text-white/35 mt-0.5">Our rules for a safe community</p>
                </div>
                <ChevronRight size={16} className="text-white/30 shrink-0" />
              </Link>
            </div>
          </section>

          {/* ── Legal ── */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-2 px-1">Legal</p>
            <div className="glass rounded-2xl overflow-hidden divide-y divide-white/[0.05]">
              {([
                { href: '/terms',   icon: <FileText size={16} className="text-white/50" />,  label: 'Terms of Service',      sub: 'Your agreement with Vibro' },
                { href: '/privacy', icon: <ScrollText size={16} className="text-white/50" />, label: 'Privacy Preferences',   sub: 'How we use your data' },
                { href: '/licenses',icon: <Scale size={16} className="text-white/50" />,      label: 'Licenses',              sub: 'Open-source & third-party licenses' },
              ]).map(({ href, icon, label, sub }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors">
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/[0.06]">{icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="text-xs text-white/35 mt-0.5">{sub}</p>
                  </div>
                  <ChevronRight size={16} className="text-white/30 shrink-0" />
                </Link>
              ))}
              <a href="https://matchgroup.com" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/[0.06]">
                  <ExternalLink size={16} className="text-white/50" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Match Group</p>
                  <p className="text-xs text-white/35 mt-0.5">Part of the Match Group family</p>
                </div>
                <ExternalLink size={14} className="text-white/20 shrink-0" />
              </a>
            </div>
          </section>

          {/* ── Professional Benefits ── */}
          <Link href="/premium?tab=professional"
            className="glass rounded-2xl p-4 flex items-center gap-4 hover:bg-white/[0.03] transition-colors border"
            style={{ borderColor: 'rgba(201,168,76,0.20)' }}>
            <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(201,168,76,0.12)' }}>
              <BookOpen size={18} style={{ color: '#C9A84C' }} />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Professional Upgrade</p>
              <p className="text-xs text-white/45 mt-0.5">Free e-book + one-time boost included</p>
            </div>
            <ChevronRight size={16} className="text-white/30" />
          </Link>

          {isAdmin && (
            <Link href="/admin"
              className="w-full glass rounded-2xl p-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors border"
              style={{ color: '#9B6DFF', borderColor: 'rgba(155,109,255,0.2)' }}>
              <ShieldCheck size={16} /> Admin Panel
            </Link>
          )}

          {/* ── Danger zone ── */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-2 px-1">Danger Zone</p>
            <div className="glass rounded-2xl overflow-hidden">
              <button onClick={() => setSection('delete')}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-red-500/[0.05] transition-colors">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(231,76,60,0.10)' }}>
                  <Trash2 size={16} style={{ color: '#E74C3C' }} />
                </span>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium" style={{ color: '#E74C3C' }}>Delete Account</p>
                  <p className="text-xs text-white/35 mt-0.5">Permanently remove your account and all data</p>
                </div>
                <ChevronRight size={16} className="text-white/30 shrink-0" />
              </button>
            </div>
          </section>

          <button onClick={handleLogout}
            className="w-full glass rounded-2xl p-4 flex items-center justify-center gap-2 text-white/50 hover:text-white text-sm font-medium transition-colors border border-white/[0.06]">
            <LogOut size={16} /> Sign Out
          </button>

          <p className="text-center text-xs text-white/20 pb-2">Vibro v1.0 · Part of Match Group</p>
        </div>
      </div>
    </div>
  );
}
