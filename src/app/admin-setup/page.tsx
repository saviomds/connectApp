'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShieldCheck, Copy, Check, ExternalLink, AlertCircle } from 'lucide-react'

interface Info {
  loggedIn: boolean
  userId?: string
  email?: string
  isConfigured: boolean
  isAdmin: boolean
}

export default function AdminSetupPage() {
  const [info, setInfo]     = useState<Info | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/admin/setup-info').then(r => r.json()).then(setInfo)
  }, [])

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!info) return (
    <div className="min-h-screen flex items-center justify-center pt-nav">
      <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-nav">
      <div className="w-full max-w-md animate-fade-up">

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(155,109,255,0.15)', border: '1px solid rgba(155,109,255,0.3)' }}>
            <ShieldCheck size={30} style={{ color: '#9B6DFF' }} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Admin Access</h1>
          <p className="text-white/40 text-sm">
            Admin access is controlled by a single UUID in your .env.local file.
          </p>
        </div>

        <div className="glass rounded-3xl p-7 flex flex-col gap-5">

          {/* Already admin */}
          {info.isAdmin && (
            <div className="text-center">
              <p className="text-green-400 font-semibold mb-4">✓ Your UUID is already configured as admin.</p>
              <Link href="/admin" className="btn-gold px-6 py-2.5 rounded-xl font-semibold text-black text-sm inline-block">
                Open Admin Panel →
              </Link>
            </div>
          )}

          {/* Not admin — show setup instructions */}
          {!info.isAdmin && (
            <>
              {/* Step 1: Sign in */}
              {!info.loggedIn && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-white/10 text-white/50 text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">1</span>
                    <div>
                      <p className="text-sm font-medium text-white">Sign in to your account first</p>
                      <p className="text-xs text-white/40 mt-0.5">You need to be logged in to see your UUID.</p>
                    </div>
                  </div>
                  <Link href="/login?next=/admin-setup" className="btn-gold h-11 rounded-xl font-semibold text-black text-sm flex items-center justify-center">
                    Sign In
                  </Link>
                </div>
              )}

              {/* Step 1 complete — show UUID */}
              {info.loggedIn && info.userId && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs text-black" style={{ background: '#C9A84C' }}>1</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white mb-1">Copy your User UUID</p>
                      <p className="text-xs text-white/40 mb-2">{info.email}</p>
                      <div className="flex items-center gap-2 glass rounded-xl px-3 py-2">
                        <code className="flex-1 text-xs text-white/70 font-mono truncate">{info.userId}</code>
                        <button onClick={() => copy(info.userId!)}
                          className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors shrink-0">
                          {copied ? <Check size={12} style={{ color: '#2ECC71' }} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-white/10 text-white/50 text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">2</span>
                    <div>
                      <p className="text-sm font-medium text-white mb-1">Paste it in <code className="text-white/60">.env.local</code></p>
                      <div className="glass rounded-xl p-3 font-mono text-xs text-white/60 leading-relaxed">
                        <span className="text-white/30">ADMIN_USER_ID=</span>
                        <span className="text-yellow-400">{info.userId}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-white/10 text-white/50 text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">3</span>
                    <div>
                      <p className="text-sm font-medium text-white">Restart the dev server</p>
                      <code className="text-xs text-white/40">npm run dev</code>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-white/10 text-white/50 text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">4</span>
                    <div>
                      <p className="text-sm font-medium text-white mb-1">Come back and open the panel</p>
                      <Link href="/admin"
                        className="flex items-center gap-1.5 text-sm font-semibold hover:opacity-80 transition-opacity"
                        style={{ color: '#9B6DFF' }}>
                        /admin <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* UUID is set but doesn't match */}
              {info.loggedIn && info.isConfigured && !info.isAdmin && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-sm text-yellow-400"
                  style={{ background: 'rgba(243,156,18,0.1)', border: '1px solid rgba(243,156,18,0.2)' }}>
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <p>ADMIN_USER_ID is set but doesn't match your account. Sign in with the correct account or update the env var.</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="text-center mt-6">
          <Link href="/discover" className="text-sm text-white/30 hover:text-white transition-colors">
            ← Back to app
          </Link>
        </div>
      </div>
    </div>
  )
}
