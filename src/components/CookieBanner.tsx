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
      style={{
        background: 'var(--app-modal)',
        border: '1px solid var(--app-border)',
        backdropFilter: 'blur(20px)',
      }}
      role="dialog"
      aria-label="Cookie consent"
    >
      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--app-text)' }}>
        We use cookies
      </p>
      <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--app-text-3)' }}>
        We use essential cookies to keep you logged in and analytics cookies to
        improve the experience. See our{' '}
        <Link href="/privacy" className="underline hover:opacity-80" style={{ color: 'var(--app-text-2)' }}>
          Privacy Policy
        </Link>{' '}
        for details.
      </p>
      <div className="flex gap-2">
        <button
          onClick={decline}
          className="flex-1 h-9 rounded-xl text-xs font-medium transition-opacity hover:opacity-70"
          style={{
            background: 'var(--app-surface)',
            border: '1px solid var(--app-border)',
            color: 'var(--app-text-3)',
          }}
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
