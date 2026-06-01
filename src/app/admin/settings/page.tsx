'use client'

import { useState, useEffect } from 'react'
import {
  Save, Eye, EyeOff, CheckCircle, AlertCircle, Loader2,
  CreditCard, ExternalLink,
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
          type={setting.is_secret && !revealed ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(setting.key, e.target.value)}
          placeholder={setting.is_set ? '••••••••  (leave blank to keep current)' : `Paste your ${setting.label}…`}
          className="w-full h-11 px-4 pr-10 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus font-mono"
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

export default function AdminSettingsPage() {
  const [settings, setSettings]   = useState<Setting[]>([])
  const [values, setValues]       = useState<Record<string, string>>({})
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then((raw: unknown) => {
        // Guard: API returns [] on success; {error} if table missing or forbidden
        const data: Setting[] = Array.isArray(raw) ? raw : []
        setSettings(data)
        const init: Record<string, string> = {}
        data.forEach(s => { init[s.key] = '' })
        setValues(init)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleChange = (key: string, v: string) => setValues(p => ({ ...p, [key]: v }))

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
    const raw = await fetch('/api/admin/settings').then(r => r.json())
    const refreshed: Setting[] = Array.isArray(raw) ? raw : []
    setSettings(refreshed)
    const blank: Record<string, string> = {}
    refreshed.forEach(s => { blank[s.key] = '' })
    setValues(blank)
    setTimeout(() => setSaved(false), 3000)
  }

  const stripeSettings = settings.filter(s => s.category === 'stripe')

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={24} className="animate-spin text-white/30" />
    </div>
  )

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
        <div className="glass rounded-2xl p-4 mb-5 border border-white/[0.06]">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Quick Setup</p>
          <ol className="flex flex-col gap-1.5 text-xs text-white/50 list-decimal list-inside leading-relaxed">
            <li>
              <a href={STRIPE_DOCS_URL} target="_blank" rel="noopener noreferrer" className="text-[#635BFF] hover:underline">
                Stripe → Developers → API keys
              </a> — copy Publishable Key + Secret Key.
            </li>
            <li>
              <a href={STRIPE_PRICES_URL} target="_blank" rel="noopener noreferrer" className="text-[#635BFF] hover:underline">
                Stripe → Products
              </a> — create 4 recurring prices (Gold $29/mo, Gold $243.60/yr, Platinum $49/mo, Platinum $411.60/yr). Copy each <code className="text-white/60">price_...</code> ID.
            </li>
            <li>
              <a href={STRIPE_WEBHOOKS_URL} target="_blank" rel="noopener noreferrer" className="text-[#635BFF] hover:underline">
                Stripe → Webhooks
              </a> — add endpoint <code className="text-white/60">https://yourdomain.com/api/stripe/webhook</code>, listen for <code className="text-white/60">checkout.session.completed</code> + <code className="text-white/60">customer.subscription.deleted</code>. Copy signing secret.
            </li>
            <li>Paste all values below and click <strong className="text-white">Save Settings</strong>.</li>
          </ol>
        </div>

        <div className="glass rounded-2xl p-6 flex flex-col gap-6">
          <div>
            <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-4">API Keys</p>
            <div className="flex flex-col gap-4">
              {stripeSettings
                .filter(s => ['stripe_publishable_key','stripe_secret_key','stripe_webhook_secret'].includes(s.key))
                .map(s => <Field key={s.key} setting={s} value={values[s.key] ?? ''} onChange={handleChange} />)}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-4">Subscription Price IDs</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {stripeSettings
                .filter(s => s.key.endsWith('_price_id'))
                .map(s => <Field key={s.key} setting={s} value={values[s.key] ?? ''} onChange={handleChange} />)}
            </div>
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving}
          className="btn-gold h-11 px-6 rounded-xl font-semibold text-black text-sm flex items-center gap-2 disabled:opacity-60">
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
    </div>
  )
}
