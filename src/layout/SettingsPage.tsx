'use client';

import { useState, useEffect } from 'react';
import type React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Lock, Bell, Shield, Trash2, LogOut,
  ChevronRight, Eye, EyeOff, CheckCircle, ShieldCheck, Loader2,
} from 'lucide-react';

interface Prefs {
  notify_matches:     boolean
  notify_messages:    boolean
  show_read_receipts: boolean
}

export default function SettingsPage({ isAdmin = false }: { isAdmin?: boolean }) {
  const router = useRouter();
  const [section, setSection]       = useState<'main' | 'password' | 'delete'>('main');
  const [newPass, setNewPass]       = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [passSuccess, setPassSuccess] = useState(false);
  const [passError, setPassError]   = useState('');
  const [passSaving, setPassSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting]     = useState(false);

  // Preference toggles
  const [prefs, setPrefs]           = useState<Prefs>({ notify_matches: true, notify_messages: true, show_read_receipts: true });
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [savingPref, setSavingPref] = useState<string | null>(null);

  // Load preferences on mount
  useEffect(() => {
    fetch('/api/settings/preferences')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) { setPrefs(data); setPrefsLoaded(true); }
      })
      .catch(() => {});
  }, []);

  async function togglePref(key: keyof Prefs) {
    const newVal = !prefs[key];
    setPrefs(p => ({ ...p, [key]: newVal }));
    setSavingPref(key);
    await fetch('/api/settings/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: newVal }),
    });
    setSavingPref(null);
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    if (newPass !== confirmPass) { setPassError('Passwords do not match'); return; }
    if (newPass.length < 6)      { setPassError('Minimum 6 characters');   return; }

    setPassSaving(true);
    const res = await fetch('/api/settings/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPass }),
    });
    setPassSaving(false);

    if (!res.ok) {
      const { error } = await res.json();
      setPassError(error ?? 'Failed to update password');
      return;
    }
    setPassSuccess(true);
    setNewPass(''); setConfirmPass('');
    setTimeout(() => setPassSuccess(false), 3000);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    await fetch('/api/settings/account', { method: 'DELETE' });
    setDeleting(false);
    router.push('/login');
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout');
    router.push('/login');
    router.refresh();
  };

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
          <input type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
            placeholder="DELETE"
            className="w-full h-12 px-4 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm mb-4 input-focus" />
          <button onClick={handleDeleteAccount} disabled={deleteConfirm !== 'DELETE' || deleting}
            className="w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-30 transition-colors"
            style={{ background: deleteConfirm === 'DELETE' ? '#E74C3C' : 'rgba(231,76,60,0.2)' }}>
            {deleting
              ? <Loader2 size={16} className="animate-spin" />
              : <><Trash2 size={16} /> Delete My Account</>}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Main section ──────────────────────────────────────────────
  function Toggle({ prefKey }: { prefKey: keyof Prefs }) {
    const on = prefs[prefKey];
    const busy = savingPref === prefKey;
    return (
      <button
        onClick={() => togglePref(prefKey)}
        disabled={!prefsLoaded || busy}
        className="relative w-11 h-6 rounded-full transition-all duration-300 disabled:opacity-50 shrink-0"
        style={{ background: on ? '#C9A84C' : 'rgba(255,255,255,0.1)' }}>
        {busy
          ? <Loader2 size={10} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-white/60" />
          : <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300"
              style={{ left: on ? '1.375rem' : '0.125rem' }} />}
      </button>
    );
  }

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
          {/* Account */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-2 px-1">Account</p>
            <div className="glass rounded-2xl overflow-hidden">
              <button onClick={() => setSection('password')}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/[0.06]">
                  <Lock size={16} className="text-white/50" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white">Change Password</p>
                  <p className="text-xs text-white/35 mt-0.5">Update your password</p>
                </div>
                <ChevronRight size={16} className="text-white/30 shrink-0" />
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-2 px-1">Notifications</p>
            <div className="glass rounded-2xl overflow-hidden">
              {([
                { key: 'notify_matches'  as const, label: 'Match alerts',   sub: 'Get notified when you match' },
                { key: 'notify_messages' as const, label: 'Message alerts', sub: 'Get notified for new messages' },
              ] as const).map(({ key, label, sub }, i) => (
                <div key={key} className={`flex items-center gap-4 px-5 py-4 ${i === 0 ? 'border-b border-white/[0.05]' : ''}`}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/[0.06]">
                    <Bell size={16} className="text-white/50" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="text-xs text-white/35 mt-0.5">{sub}</p>
                  </div>
                  <Toggle prefKey={key} />
                </div>
              ))}
            </div>
          </div>

          {/* Privacy */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-2 px-1">Privacy</p>
            <div className="glass rounded-2xl overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.05]">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/[0.06]">
                  <Shield size={16} className="text-white/50" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Profile visibility</p>
                  <p className="text-xs text-white/35 mt-0.5">Everyone can discover your profile</p>
                </div>
              </div>
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/[0.06]">
                  <Eye size={16} className="text-white/50" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Read receipts</p>
                  <p className="text-xs text-white/35 mt-0.5">Show when you&apos;ve read messages</p>
                </div>
                <Toggle prefKey="show_read_receipts" />
              </div>
            </div>
          </div>

          {/* Danger zone */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-2 px-1">Danger zone</p>
            <div className="glass rounded-2xl overflow-hidden">
              <button onClick={() => setSection('delete')}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-red-500/[0.05] transition-colors">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(231,76,60,0.1)' }}>
                  <Trash2 size={16} style={{ color: '#E74C3C' }} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium" style={{ color: '#E74C3C' }}>Delete Account</p>
                  <p className="text-xs text-white/35 mt-0.5">Permanently delete your account and all data</p>
                </div>
                <ChevronRight size={16} className="text-white/30 shrink-0" />
              </button>
            </div>
          </div>

          {isAdmin && (
            <Link href="/admin"
              className="w-full glass rounded-2xl p-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors border"
              style={{ color: '#9B6DFF', borderColor: 'rgba(155,109,255,0.2)' }}>
              <ShieldCheck size={16} /> Admin Panel
            </Link>
          )}

          <button onClick={handleLogout}
            className="w-full glass rounded-2xl p-4 flex items-center justify-center gap-2 text-white/50 hover:text-white text-sm font-medium transition-colors border border-white/[0.06]">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
