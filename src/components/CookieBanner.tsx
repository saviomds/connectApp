'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'vibro_cookie_consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) setVisible(true)
  }, [])

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    setVisible(false)
  }

  const decline = () => {
    localStorage.setItem(STORAGE_KEY, 'declined')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 rounded-2xl p-4 shadow-2xl"
      style={{ background: 'rgba(18,18,22,0.97)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}
      role="dialog"
      aria-label="Cookie consent"
    >
      <p className="text-sm font-semibold text-white mb-1">We use cookies</p>
      <p className="text-xs text-white/50 leading-relaxed mb-4">
        We use essential cookies to keep you logged in and analytics cookies to
        improve the experience. See our{' '}
        <Link href="/privacy" className="underline text-white/60 hover:text-white">
          Privacy Policy
        </Link>{' '}
        for details.
      </p>
      <div className="flex gap-2">
        <button
          onClick={decline}
          className="flex-1 h-9 rounded-xl text-xs font-medium text-white/40 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          Decline
        </button>
        <button
          onClick={accept}
          className="flex-1 h-9 rounded-xl text-xs font-semibold text-black transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#C9A84C,#E5C76B)' }}
        >
          Accept all
        </button>
      </div>
    </div>
  )
}
