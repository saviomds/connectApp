'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Save, Eye, EyeOff, CheckCircle, AlertCircle, Loader2,
  CreditCard, ExternalLink, Copy, Check, Terminal, RefreshCw,
  AlertTriangle, Smartphone,
} from 'lucide-react'

interface Setting {
  key: string
  value: string
  label: string
  description: string | null
  category: string
  is_secret: boolean
  is_set: boolean
}

const STRIPE_DOCS_URL     = 'https://dashboard.stripe.com/apikeys'
const STRIPE_PRICES_URL   = 'https://dashboard.stripe.com/products'
const STRIPE_WEBHOOKS_URL = 'https://dashboard.stripe.com/webhooks'

const SETUP_SQL = `-- Paste this in Supabase Dashboard → SQL Editor → Run

CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT        PRIMARY KEY,
  value       TEXT        NOT NULL DEFAULT '',
  label       TEXT        NOT NULL,
  description TEXT,
  category    TEXT        NOT NULL DEFAULT 'general',
  is_secret   BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (key, value, label, description, category, is_secret) VALUES
  ('stripe_publishable_key',          '', 'Stripe Publishable Key',       'Your pk_live_ or pk_test_ key',                     'stripe', false),
  ('stripe_secret_key',               '', 'Stripe Secret Key',            'Your sk_live_ or sk_test_ key',                     'stripe', true),
  ('stripe_webhook_secret',           '', 'Stripe Webhook Secret',        'whsec_... from Stripe Dashboard → Webhooks',        'stripe', true),
  ('stripe_gold_monthly_price_id',    '', 'Gold Monthly Price ID',        'price_... – $29/month',                             'stripe', false),
  ('stripe_gold_yearly_price_id',     '', 'Gold Yearly Price ID',         'price_... – $243.60/year',                          'stripe', false),
  ('stripe_platinum_monthly_price_id','', 'Platinum Monthly Price ID',    'price_... – $49/month',                             'stripe', false),
  ('stripe_platinum_yearly_price_id', '', 'Platinum Yearly Price ID',     'price_... – $411.60/year',                          'stripe', false)
ON CONFLICT (key) DO NOTHING;

-- Juice Mobile Payment settings
INSERT INTO app_settings (key, value, label, description, category, is_secret) VALUES
  ('juice_enabled',      'false', 'Juice Payments Enabled', 'Enable Juice mobile payment as a fallback when Stripe is not configured', 'juice', false),
  ('juice_phone',        '',      'Juice Phone Number',      'Phone number users send payment to (e.g. +230 5XXX XXXX)', 'juice', false),
  ('juice_account_name', '',      'Account Holder Name',     'Name shown to users on the payment instructions', 'juice', false),
  ('juice_instructions', '',      'Payment Instructions',    'Custom instructions shown to users (optional)', 'juice', false),
  ('juice_qr_url',       '',      'QR Code Image URL',       'Public URL of your Juice QR code image (optional)', 'juice', false)
ON CONFLICT (key) DO NOTHING;

-- Juice payment submissions table
CREATE TABLE IF NOT EXISTS juice_payment_submissions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id         TEXT        NOT NULL,
  full_name       TEXT        NOT NULL,
  email           TEXT        NOT NULL,
  phone           TEXT        NOT NULL,
  txn_ref         TEXT,
  screenshot_path TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  admin_notes     TEXT,
  reviewed_by     UUID        REFERENCES profiles(id),
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE juice_payment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "juice_subs: users can view own" ON juice_payment_submissions
  FOR SELECT USING (auth.uid() = user_id);
-- IMPORTANT: also create a private Storage bucket named "juice-screenshots"
-- in Supabase Dashboard → Storage → New bucket

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings: public read non-secret" ON app_settings;
DROP POLICY IF EXISTS "settings: admin read all"         ON app_settings;
DROP POLICY IF EXISTS "settings: admin write"            ON app_settings;
DROP POLICY IF EXISTS "settings: read non-secret"        ON app_settings;

CREATE POLICY "settings: public read non-secret" ON app_settings
  FOR SELECT USING (is_secret = false);

CREATE OR REPLACE FUNCTION touch_app_settings()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS app_settings_updated_at ON app_settings;
CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION touch_app_settings();

CREATE OR REPLACE FUNCTION get_setting(p_key TEXT)
RETURNS TEXT LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT value FROM app_settings WHERE key = p_key;
$$;`

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button onClick={copy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={{
        background: copied ? 'rgba(46,204,113,0.15)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${copied ? 'rgba(46,204,113,0.3)' : 'rgba(255,255,255,0.1)'}`,
        color: copied ? '#2ecc71' : 'rgba(255,255,255,0.5)',
      }}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copied!' : 'Copy SQL'}
    </button>
  )
}

function Field({ setting, value, onChange }: {
  setting: Setting
  value: string
  onChange: (key: string, v: string) => void
}) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <label className="text-sm font-medium text-white/70">{setting.label}</label>
        {setting.is_set && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-green-400"
            style={{ background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.2)' }}>
            SET
          </span>
        )}
      </div>
      {setting.description && (
        <p className="text-xs text-white/30 mb-1.5">{setting.description}</p>
      )}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(setting.key, e.target.value)}
          placeholder={setting.is_set ? '(leave blank to keep current value)' : `Paste your ${setting.label}…`}
          autoComplete="off"
          spellCheck={false}
          data-1p-ignore
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            outline: 'none',
            // CSS masking instead of type="password" — paste works reliably
            WebkitTextSecurity: setting.is_secret && !revealed ? 'disc' : 'none',
          } as React.CSSProperties}
          className="w-full h-11 px-4 pr-10 rounded-xl text-white text-sm font-mono"
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(99,91,255,0.5)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
        />
        {setting.is_secret && (
          <button type="button" onClick={() => setRevealed(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
            {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
    </div>
  )
}

function TextareaField({ setting, value, onChange }: {
  setting: Setting
  value: string
  onChange: (key: string, v: string) => void
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <label className="text-sm font-medium text-white/70">{setting.label}</label>
        {setting.is_set && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-green-400"
            style={{ background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.2)' }}>
            SET
          </span>
        )}
      </div>
      {setting.description && (
        <p className="text-xs text-white/30 mb-1.5">{setting.description}</p>
      )}
      <textarea
        value={value}
        onChange={e => onChange(setting.key, e.target.value)}
        placeholder={setting.is_set ? '(leave blank to keep current value)' : `Enter ${setting.label}…`}
        rows={3}
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          outline: 'none',
        }}
        className="w-full px-4 py-3 rounded-xl text-white text-sm resize-none"
        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(99,91,255,0.5)')}
        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
      />
    </div>
  )
}

function ToggleField({ label, description, enabled, onChange }: {
  label: string
  description?: string
  enabled: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-white/70">{label}</p>
        {description && <p className="text-xs text-white/30 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        aria-pressed={enabled}
        className="relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0"
        style={{ background: enabled ? '#2ECC71' : 'rgba(255,255,255,0.15)' }}>
        <span
          className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 shadow"
          style={{ left: enabled ? '22px' : '4px' }}
        />
      </button>
    </div>
  )
}

type ErrorStatus = 'table_missing' | 'no_service_key' | 'db_error' | 'exception' | null

export default function AdminSettingsPage() {
  const [settings, setSettings]       = useState<Setting[]>([])
  const [values, setValues]           = useState<Record<string, string>>({})
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [saveError, setSaveError]     = useState('')
  const [errorStatus, setErrorStatus] = useState<ErrorStatus>(null)
  const [errorMsg, setErrorMsg]       = useState('')
  const [seeding, setSeeding]         = useState(false)
  const [seedMsg, setSeedMsg]         = useState('')
  const [resetting, setResetting]         = useState(false)
  const [resetConfirm, setResetConfirm]   = useState(false)
  const [resetResult, setResetResult]     = useState<{ ok: boolean; msg: string } | null>(null)
  const [resettingPB, setResettingPB]     = useState(false)
  const [resetPBConfirm, setResetPBConfirm] = useState(false)
  const [resetPBResult, setResetPBResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const loadSettings = useCallback(() => {
    setLoading(true)
    setErrorStatus(null)
    setErrorMsg('')
    fetch('/api/admin/settings')
      .then(async r => {
        const raw = await r.json() as unknown
        if (Array.isArray(raw)) {
          // Success — could be 0 rows (table empty) or 7 rows (seeded)
          setSettings(raw as Setting[])
          const init: Record<string, string> = {}
          ;(raw as Setting[]).forEach(s => { init[s.key] = '' })
          setValues(init)
          // 0 rows means table exists but not seeded — auto-seed
          if ((raw as Setting[]).length === 0) {
            setErrorStatus('table_missing')
          }
        } else {
          // Error object from the API
          const err = raw as { error?: string; status?: string }
          setErrorStatus((err.status as ErrorStatus) ?? 'exception')
          setErrorMsg(err.error ?? 'Unknown error')
        }
        setLoading(false)
      })
      .catch(e => {
        setErrorStatus('exception')
        setErrorMsg(String(e))
        setLoading(false)
      })
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  const handleChange = (key: string, v: string) => setValues(p => ({ ...p, [key]: v }))

  const handleSeed = async () => {
    setSeeding(true)
    setSeedMsg('')
    const res = await fetch('/api/admin/init-settings', { method: 'POST' })
    const json = await res.json() as { status?: string; error?: string }
    if (json.status === 'ok') {
      setSeedMsg('Seeded! Reloading…')
      loadSettings()
    } else if (json.status === 'table_missing') {
      setSeedMsg('Table still missing — run the SQL below first.')
    } else {
      setSeedMsg(json.error ?? 'Unknown error from seed endpoint.')
    }
    setSeeding(false)
  }

  const handleReset = async () => {
    setResetting(true)
    setResetResult(null)
    try {
      const res  = await fetch('/api/admin/reset-matches', { method: 'POST' })
      const json = await res.json() as { ok?: boolean; error?: string }
      if (res.ok) setResetResult({ ok: true,  msg: 'All swipes, matches, conversations and messages deleted. Discovery is fully reset.' })
      else        setResetResult({ ok: false, msg: json.error ?? 'Reset failed' })
    } catch {
      setResetResult({ ok: false, msg: 'Network error' })
    }
    setResetting(false)
    setResetConfirm(false)
  }

  const handleResetPB = async () => {
    setResettingPB(true)
    setResetPBResult(null)
    try {
      const res  = await fetch('/api/admin/reset-passes', { method: 'POST' })
      const json = await res.json() as { ok?: boolean; error?: string }
      if (res.ok) setResetPBResult({ ok: true,  msg: 'All passes and blocks cleared. Every user is discoverable again.' })
      else        setResetPBResult({ ok: false, msg: json.error ?? 'Reset failed' })
    } catch {
      setResetPBResult({ ok: false, msg: 'Network error' })
    }
    setResettingPB(false)
    setResetPBConfirm(false)
  }

  const handleSave = async () => {
    setSaving(true); setSaveError(''); setSaved(false)

    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    setSaving(false)

    if (!res.ok) {
      const { error } = await res.json()
      setSaveError(error ?? 'Failed to save')
      return
    }

    setSaved(true)
    loadSettings()
    setTimeout(() => setSaved(false), 3000)
  }

  const stripeSettings  = settings.filter(s => s.category === 'stripe')
  const apiKeySettings  = stripeSettings.filter(s =>
    ['stripe_publishable_key', 'stripe_secret_key', 'stripe_webhook_secret'].includes(s.key))
  const priceIdSettings = stripeSettings.filter(s => s.key.endsWith('_price_id'))

  const juiceSettings   = settings.filter(s => s.category === 'juice')
  const juiceEnabledInDB = juiceSettings.find(s => s.key === 'juice_enabled')?.value === 'true'
  const juiceEnabled    = values['juice_enabled'] !== ''
    ? values['juice_enabled'] === 'true'
    : juiceEnabledInDB
  const juiceTextSettings = juiceSettings.filter(s => s.key !== 'juice_enabled')

  // ── Danger Zone JSX (shared between both non-loading returns) ────────────
  const dangerZone = (
    <section className="pt-8 mt-10" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.2)' }}>
          <AlertTriangle size={15} style={{ color: '#E74C3C' }} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Danger Zone</h2>
          <p className="text-xs text-white/35">Irreversible actions — data cannot be recovered.</p>
        </div>
      </div>

      <div className="rounded-2xl p-5"
        style={{ background: 'rgba(231,76,60,0.05)', border: '1px solid rgba(231,76,60,0.18)' }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Reset All Matching</p>
            <p className="text-xs text-white/40 mt-1 leading-relaxed max-w-sm">
              Permanently deletes all swipes, matches, conversations and messages.
              Every user will be able to discover and swipe on everyone again from scratch.
            </p>
          </div>
          <div className="shrink-0">
            {!resetConfirm ? (
              <button
                onClick={() => setResetConfirm(true)}
                className="h-9 px-4 rounded-xl text-xs font-semibold transition-all"
                style={{ background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.28)', color: '#E74C3C' }}>
                Reset Matching
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/35">Sure?</span>
                <button
                  onClick={() => setResetConfirm(false)}
                  className="h-8 px-3 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.5)' }}>
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-60 transition-all"
                  style={{ background: '#E74C3C', color: '#fff' }}>
                  {resetting && <Loader2 size={12} className="animate-spin" />}
                  {resetting ? 'Resetting…' : 'Yes, reset all'}
                </button>
              </div>
            )}
          </div>
        </div>
        {resetResult && (
          <div className="mt-3 flex items-center gap-2 text-xs"
            style={{ color: resetResult.ok ? '#2ecc71' : '#E74C3C' }}>
            {resetResult.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
            {resetResult.msg}
          </div>
        )}
      </div>

      {/* Reset passes + blocks — lighter action, keeps matches & messages */}
      <div className="rounded-2xl p-5 mt-3"
        style={{ background: 'rgba(231,76,60,0.05)', border: '1px solid rgba(231,76,60,0.18)' }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Reset Passes &amp; Blocks</p>
            <p className="text-xs text-white/40 mt-1 leading-relaxed max-w-sm">
              Clears all disliked (passed) swipes and all blocks for every user.
              Existing matches, conversations and messages are kept intact.
              Users who were passed on or blocked will appear in discovery again.
            </p>
          </div>
          <div className="shrink-0">
            {!resetPBConfirm ? (
              <button
                onClick={() => setResetPBConfirm(true)}
                className="h-9 px-4 rounded-xl text-xs font-semibold transition-all"
                style={{ background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.28)', color: '#E74C3C' }}>
                Reset Passes &amp; Blocks
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/35">Sure?</span>
                <button
                  onClick={() => setResetPBConfirm(false)}
                  className="h-8 px-3 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.5)' }}>
                  Cancel
                </button>
                <button
                  onClick={handleResetPB}
                  disabled={resettingPB}
                  className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-60 transition-all"
                  style={{ background: '#E74C3C', color: '#fff' }}>
                  {resettingPB && <Loader2 size={12} className="animate-spin" />}
                  {resettingPB ? 'Resetting…' : 'Yes, reset'}
                </button>
              </div>
            )}
          </div>
        </div>
        {resetPBResult && (
          <div className="mt-3 flex items-center gap-2 text-xs"
            style={{ color: resetPBResult.ok ? '#2ecc71' : '#E74C3C' }}>
            {resetPBResult.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
            {resetPBResult.msg}
          </div>
        )}
      </div>
    </section>
  )

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={24} className="animate-spin text-white/30" />
    </div>
  )

  // ── Error / not set up ───────────────────────────────────────────────────
  if (errorStatus || settings.length === 0) {
    const isServiceKey = errorStatus === 'no_service_key'
    const isTableMiss  = errorStatus === 'table_missing' || settings.length === 0

    const bannerTitle = isServiceKey
      ? 'Service role key missing'
      : isTableMiss
        ? 'Database table not set up'
        : `Database error (${errorStatus})`

    const bannerBody = isServiceKey
      ? <>Add <code className="text-white/60">SUPABASE_SERVICE_ROLE_KEY</code> to your <code className="text-white/60">.env.local</code> and restart the dev server. Find it in Supabase Dashboard → Project Settings → API → <em>service_role</em> key.</>
      : isTableMiss
        ? <>The <code className="text-white/60">app_settings</code> table is empty or missing. Run the SQL below in your <strong className="text-white">Supabase SQL Editor</strong>, then click <strong className="text-white">Retry</strong>.</>
        : <>{errorMsg || 'Check the server console for details.'}</>

    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-white/40 text-sm mt-1">Configure payment keys — no code or .env changes needed.</p>
        </div>

        {/* Banner */}
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: 'rgba(255,168,0,0.07)', border: '1px solid rgba(255,168,0,0.2)' }}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: 'rgba(255,168,0,0.12)', border: '1px solid rgba(255,168,0,0.2)' }}>
              <AlertTriangle size={16} style={{ color: '#FFA800' }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{bannerTitle}</p>
              <p className="text-xs text-white/40 mt-1 leading-relaxed">{bannerBody}</p>
            </div>
          </div>

          {/* Actions */}
          {!isServiceKey && (
            <div className="flex items-center gap-3 pt-1">
              <button onClick={handleSeed} disabled={seeding}
                className="flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                style={{ background: 'rgba(99,91,255,0.18)', border: '1px solid rgba(99,91,255,0.3)', color: '#a5a0ff' }}>
                {seeding ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                {seeding ? 'Seeding…' : 'Try auto-seed'}
              </button>
              <button onClick={loadSettings}
                className="flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-semibold transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                <RefreshCw size={13} /> Retry
              </button>
            </div>
          )}
          {isServiceKey && (
            <button onClick={loadSettings}
              className="flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-semibold transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
              <RefreshCw size={13} /> Retry after adding key
            </button>
          )}

          {seedMsg && (
            <p className="text-xs text-white/50 pl-1">{seedMsg}</p>
          )}
        </div>

        {/* SQL block — only shown when the fix is to run SQL */}
        {!isServiceKey && <>
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2.5">
              <Terminal size={14} className="text-white/30" />
              <span className="text-xs font-semibold text-white/40">supabase/settings.sql</span>
            </div>
            <CopyButton text={SETUP_SQL} />
          </div>
          <pre className="p-4 text-[11px] text-white/50 overflow-x-auto leading-relaxed font-mono max-h-72 overflow-y-auto"
            style={{ background: 'rgba(0,0,0,0.3)' }}>
            {SETUP_SQL}
          </pre>
        </div>

        <div className="rounded-xl p-4 text-xs text-white/35 leading-relaxed space-y-1"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="font-semibold text-white/50">How to run this:</p>
          <ol className="list-decimal list-inside space-y-1 pl-1">
            <li>Open <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline text-white/50 hover:text-white/70">Supabase Dashboard</a> → your project → <strong className="text-white/40">SQL Editor</strong></li>
            <li>Click <strong className="text-white/40">New query</strong>, paste the SQL above, click <strong className="text-white/40">Run</strong></li>
            <li>Come back here and click <strong className="text-white/40">Retry</strong></li>
          </ol>
        </div>
        </>}

        {dangerZone}
      </div>
    )
  }

  // ── Settings form ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-white/40 text-sm mt-1">
          Configure payment keys — no code or .env changes needed.
        </p>
      </div>

      {/* Stripe */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(99,91,255,0.15)', border: '1px solid rgba(99,91,255,0.25)' }}>
            <CreditCard size={15} style={{ color: '#635BFF' }} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-white">Stripe Configuration</h2>
            <p className="text-xs text-white/35">Connect your Stripe account to accept premium subscriptions.</p>
          </div>
          <div className="flex items-center gap-3">
            {[
              { label: 'API Keys',  href: STRIPE_DOCS_URL },
              { label: 'Products', href: STRIPE_PRICES_URL },
              { label: 'Webhooks', href: STRIPE_WEBHOOKS_URL },
            ].map(({ label, href }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors">
                {label} <ExternalLink size={10} />
              </a>
            ))}
          </div>
        </div>

        {/* Quick setup */}
        <div className="rounded-2xl p-4 mb-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Quick Setup</p>
          <ol className="flex flex-col gap-1.5 text-xs text-white/50 list-decimal list-inside leading-relaxed">
            <li>
              <a href={STRIPE_DOCS_URL} target="_blank" rel="noopener noreferrer" className="text-[#635BFF] hover:underline">
                Stripe → Developers → API keys
              </a>{' '}— copy Publishable Key + Secret Key.
            </li>
            <li>
              <a href={STRIPE_PRICES_URL} target="_blank" rel="noopener noreferrer" className="text-[#635BFF] hover:underline">
                Stripe → Products
              </a>{' '}— create 4 recurring prices (Gold $29/mo, Gold $243.60/yr, Platinum $49/mo, Platinum $411.60/yr). Copy each <code className="text-white/60">price_...</code> ID.
            </li>
            <li>
              <a href={STRIPE_WEBHOOKS_URL} target="_blank" rel="noopener noreferrer" className="text-[#635BFF] hover:underline">
                Stripe → Webhooks
              </a>{' '}— add endpoint <code className="text-white/60">{typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/api/stripe/webhook</code>, listen for <code className="text-white/60">checkout.session.completed</code> + <code className="text-white/60">customer.subscription.deleted</code>. Copy signing secret.
            </li>
            <li>Paste all values below and click <strong className="text-white">Save Settings</strong>.</li>
          </ol>
        </div>

        <div className="rounded-2xl p-6 flex flex-col gap-8"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>

          {/* API Keys */}
          {apiKeySettings.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-4">API Keys</p>
              <div className="flex flex-col gap-4">
                {apiKeySettings.map(s => (
                  <Field key={s.key} setting={s} value={values[s.key] ?? ''} onChange={handleChange} />
                ))}
              </div>
            </div>
          )}

          {/* Price IDs */}
          {priceIdSettings.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-4">Subscription Price IDs</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {priceIdSettings.map(s => (
                  <Field key={s.key} setting={s} value={values[s.key] ?? ''} onChange={handleChange} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Juice Mobile Payment ────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.2)' }}>
            <Smartphone size={15} style={{ color: '#2ECC71' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Juice Mobile Payment</h2>
            <p className="text-xs text-white/35">
              Fallback payment method — shown when Stripe is not configured.
            </p>
          </div>
        </div>

        {juiceSettings.length === 0 ? (
          <div className="rounded-2xl p-4 text-sm text-white/50 leading-relaxed"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-semibold text-white/60 mb-1">Juice settings not seeded yet</p>
            <p className="text-xs text-white/35 mb-3">
              Run the updated SQL above (which now includes Juice settings), or click{' '}
              <strong className="text-white/50">Try auto-seed</strong> in the warning banner above.
              If you already ran the old SQL, click auto-seed to add the missing Juice rows.
            </p>
            <button onClick={handleSeed} disabled={seeding}
              className="flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
              style={{ background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.2)', color: '#2ECC71' }}>
              {seeding ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {seeding ? 'Seeding…' : 'Seed Juice settings'}
            </button>
            {seedMsg && <p className="text-xs text-white/40 mt-2">{seedMsg}</p>}
          </div>
        ) : (
          <div className="rounded-2xl p-6 flex flex-col gap-6"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <ToggleField
              label="Enable Juice Payments"
              description="When enabled and Stripe is not configured, users see the Juice payment form."
              enabled={juiceEnabled}
              onChange={v => handleChange('juice_enabled', v ? 'true' : 'false')}
            />

            <div className={`flex flex-col gap-4 transition-opacity ${juiceEnabled ? '' : 'opacity-40 pointer-events-none'}`}>
              {juiceTextSettings.filter(s => s.key !== 'juice_instructions').map(s => (
                <Field key={s.key} setting={s} value={values[s.key] ?? ''} onChange={handleChange} />
              ))}
              {juiceTextSettings.filter(s => s.key === 'juice_instructions').map(s => (
                <TextareaField key={s.key} setting={s} value={values[s.key] ?? ''} onChange={handleChange} />
              ))}
            </div>

            <div className="pt-2 text-xs text-white/30 leading-relaxed"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="font-semibold text-white/40 mb-1">Storage bucket required</p>
              Create a <strong className="text-white/50">private</strong> bucket named{' '}
              <code className="text-white/50">juice-screenshots</code> in{' '}
              <strong className="text-white/50">Supabase Dashboard → Storage</strong>.
              Payment screenshots are stored there and only accessible by admins.
            </div>
          </div>
        )}
      </section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving}
          className="h-11 px-6 rounded-xl font-semibold text-sm flex items-center gap-2 disabled:opacity-60 transition-all"
          style={{ background: '#F5C842', color: '#000' }}>
          {saving
            ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
            : <><Save size={15} /> Save Settings</>}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-400">
            <CheckCircle size={15} /> Saved!
          </span>
        )}
        {saveError && (
          <span className="flex items-center gap-1.5 text-sm text-red-400">
            <AlertCircle size={15} /> {saveError}
          </span>
        )}
      </div>

      {dangerZone}
    </div>
  )
}
