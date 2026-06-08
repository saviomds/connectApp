'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shield, ShieldCheck, ShieldOff, Loader2, X, Copy, Check } from 'lucide-react'
import Image from 'next/image'

interface Props {
  onStatusChange?: (enabled: boolean) => void
}

export default function TwoFactorSetup({ onStatusChange }: Props) {
  const [loading,    setLoading]    = useState(true)
  const [enabled,    setEnabled]    = useState(false)
  const [factorId,   setFactorId]   = useState<string | null>(null)
  const [open,       setOpen]       = useState(false)
  const [step,       setStep]       = useState<'qr' | 'verify' | 'disable'>('qr')
  const [qrUrl,      setQrUrl]      = useState('')
  const [secret,     setSecret]     = useState('')
  const [code,       setCode]       = useState('')
  const [error,      setError]      = useState('')
  const [working,    setWorking]    = useState(false)
  const [copied,     setCopied]     = useState(false)

  const supabase = createClient()

  useEffect(() => {
    checkStatus()
  }, [])

  async function checkStatus() {
    setLoading(true)
    const { data } = await supabase.auth.mfa.listFactors()
    const totp = data?.totp?.find(f => f.factor_type === 'totp' && f.status === 'verified')
    setEnabled(!!totp)
    setFactorId(totp?.id ?? null)
    setLoading(false)
  }

  async function startEnroll() {
    setError('')
    setCode('')
    setWorking(true)
    // Unenroll any existing unverified factors before starting fresh
    const { data: existing } = await supabase.auth.mfa.listFactors()
    for (const f of (existing?.totp ?? []) as { id: string; status: string }[]) {
      if (f.status !== 'verified') {
        await supabase.auth.mfa.unenroll({ factorId: f.id })
      }
    }
    const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Vibro Authenticator' })
    setWorking(false)
    if (err || !data) { setError(err?.message ?? 'Failed to generate QR code'); return }
    setQrUrl(data.totp.qr_code.trim())
    setSecret(data.totp.secret)
    setFactorId(data.id)
    setError('')
    setStep('qr')
    setOpen(true)
  }

  async function verifyCode() {
    if (!factorId || code.length !== 6) return
    setError('')
    setWorking(true)
    const { data: challenge } = await supabase.auth.mfa.challenge({ factorId })
    if (!challenge) { setError('Could not start challenge'); setWorking(false); return }
    const { error: err } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code })
    setWorking(false)
    if (err) { setError('Incorrect code. Try again.'); return }
    setEnabled(true)
    onStatusChange?.(true)
    setOpen(false)
    setCode('')
  }

  async function disable2FA() {
    if (!factorId) return
    setError('')
    setWorking(true)
    const { error: err } = await supabase.auth.mfa.unenroll({ factorId })
    setWorking(false)
    if (err) { setError(err.message); return }
    setEnabled(false)
    setFactorId(null)
    onStatusChange?.(false)
    setOpen(false)
  }

  function copySecret() {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="w-full flex items-center gap-4 px-5 py-4">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/[0.06]">
          <Shield size={16} className="text-white/50" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>Two-Factor Authentication</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--app-text-3)' }}>Loading…</p>
        </div>
        <Loader2 size={16} className="animate-spin text-white/30 shrink-0" />
      </div>
    )
  }

  return (
    <>
      <button
        disabled={working}
        onClick={() => {
          if (enabled) { setStep('disable'); setOpen(true) }
          else startEnroll()
        }}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors text-left disabled:opacity-60 disabled:cursor-wait"
      >
        <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={enabled
            ? { background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.25)' }
            : { background: 'rgba(255,255,255,0.06)' }}>
          {working
            ? <Loader2 size={16} className="animate-spin text-white/40" />
            : enabled
              ? <ShieldCheck size={16} style={{ color: '#2ECC71' }} />
              : <Shield size={16} className="text-white/50" />}
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>
            Two-Factor Authentication
            {enabled && (
              <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(46,204,113,0.15)', color: '#2ECC71' }}>
                ON
              </span>
            )}
          </p>
          <p className="text-xs mt-0.5" style={{ color: error && !open ? '#E74C3C' : 'var(--app-text-3)' }}>
            {error && !open
              ? error
              : enabled
                ? 'Authenticator app is protecting your account'
                : working
                  ? 'Setting up…'
                  : 'Add an extra layer of security with an authenticator app'}
          </p>
        </div>
        {!working && (
          <span className="text-xs font-semibold shrink-0"
            style={{ color: enabled ? '#E74C3C' : '#C9A84C' }}>
            {enabled ? 'Disable' : 'Enable'}
          </span>
        )}
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center px-0 sm:px-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <div className="relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 flex flex-col gap-4"
            style={{ background: 'var(--app-modal)', border: '1px solid var(--app-border)' }}>
            <button onClick={() => setOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--app-text-3)' }}>
              <X size={16} />
            </button>

            {/* QR step */}
            {step === 'qr' && (
              <>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}>
                    <Shield size={22} style={{ color: '#C9A84C' }} />
                  </div>
                  <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--app-text)' }}>Set Up Authenticator</h2>
                  <p className="text-sm" style={{ color: 'var(--app-text-3)' }}>
                    Scan this QR code with Google Authenticator, Authy, or any TOTP app.
                  </p>
                </div>

                {qrUrl && (
                  <div className="flex justify-center">
                    <div className="p-3 bg-white rounded-2xl">
                      <Image src={qrUrl} alt="2FA QR code" width={176} height={176} unoptimized />
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs mb-1.5 font-medium" style={{ color: 'var(--app-text-3)' }}>Or enter this key manually:</p>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--app-border)' }}>
                    <code className="flex-1 text-xs font-mono tracking-wider break-all" style={{ color: 'var(--app-text)' }}>
                      {secret}
                    </code>
                    <button onClick={copySecret}
                      className="shrink-0 p-1.5 rounded-lg transition-colors"
                      style={{ color: copied ? '#2ECC71' : 'var(--app-text-3)' }}>
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <button onClick={() => setStep('verify')}
                  className="w-full h-11 rounded-2xl font-bold text-sm text-black"
                  style={{ background: '#C9A84C' }}>
                  I&apos;ve scanned it — Next
                </button>
              </>
            )}

            {/* Verify step */}
            {step === 'verify' && (
              <>
                <div className="text-center">
                  <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--app-text)' }}>Enter Your Code</h2>
                  <p className="text-sm" style={{ color: 'var(--app-text-3)' }}>
                    Enter the 6-digit code from your authenticator app to confirm setup.
                  </p>
                </div>

                <input
                  type="text" inputMode="numeric" pattern="[0-9]*"
                  maxLength={6} value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full h-14 text-center text-2xl font-bold tracking-[0.3em] rounded-2xl outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: error ? '1px solid rgba(231,76,60,0.6)' : '1px solid var(--app-border)',
                    color: 'var(--app-text)',
                  }}
                />

                {error && <p className="text-center text-sm" style={{ color: '#E74C3C' }}>{error}</p>}

                <div className="flex gap-3">
                  <button onClick={() => setStep('qr')}
                    className="flex-1 h-11 rounded-2xl text-sm font-medium transition-colors"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--app-border)', color: 'var(--app-text-3)' }}>
                    Back
                  </button>
                  <button onClick={verifyCode} disabled={code.length !== 6 || working}
                    className="flex-1 h-11 rounded-2xl font-bold text-sm text-black disabled:opacity-40"
                    style={{ background: '#C9A84C' }}>
                    {working ? <Loader2 size={15} className="animate-spin mx-auto" /> : 'Verify & Enable'}
                  </button>
                </div>
              </>
            )}

            {/* Disable step */}
            {step === 'disable' && (
              <>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.3)' }}>
                    <ShieldOff size={22} style={{ color: '#E74C3C' }} />
                  </div>
                  <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--app-text)' }}>Disable 2FA?</h2>
                  <p className="text-sm" style={{ color: 'var(--app-text-3)' }}>
                    This will remove your authenticator app protection. You can re-enable it any time.
                  </p>
                </div>

                {error && <p className="text-center text-sm" style={{ color: '#E74C3C' }}>{error}</p>}

                <div className="flex gap-3">
                  <button onClick={() => setOpen(false)}
                    className="flex-1 h-11 rounded-2xl text-sm font-medium"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--app-border)', color: 'var(--app-text-3)' }}>
                    Cancel
                  </button>
                  <button onClick={disable2FA} disabled={working}
                    className="flex-1 h-11 rounded-2xl font-bold text-sm text-white disabled:opacity-40"
                    style={{ background: '#E74C3C' }}>
                    {working ? <Loader2 size={15} className="animate-spin mx-auto" /> : 'Disable 2FA'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
