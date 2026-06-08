'use client'

import { useEffect, useState } from 'react'
import { BellRing, X } from 'lucide-react'
import { requestAndSubscribePush } from '@/components/ServiceWorkerRegistrar'

const DISMISSED_KEY = 'push_prompt_dismissed'

export default function PushPrompt() {
  const [show, setShow]       = useState(false)
  const [enabling, setEnabling] = useState(false)

  useEffect(() => {
    // Only show when:
    // 1. Running as installed PWA (standalone / fullscreen)
    // 2. Notification API exists (iOS 16.4+ home screen, Android, desktop)
    // 3. Permission not yet decided
    // 4. User hasn't already dismissed this banner
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as { standalone?: boolean }).standalone === true

    if (
      isStandalone &&
      'Notification' in window &&
      Notification.permission === 'default' &&
      !localStorage.getItem(DISMISSED_KEY)
    ) {
      // Small delay so it doesn't flash on load
      const t = setTimeout(() => setShow(true), 1500)
      return () => clearTimeout(t)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setShow(false)
  }

  async function enable() {
    setEnabling(true)
    const result = await requestAndSubscribePush()
    setEnabling(false)
    if (result === 'granted') {
      localStorage.setItem(DISMISSED_KEY, '1')
      setShow(false)
    }
  }

  if (!show) return null

  return (
    <div
      className="fixed bottom-24 left-4 right-4 z-[70] flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl md:left-auto md:right-6 md:w-96"
      style={{ background: 'var(--app-modal)', border: '1px solid rgba(201,168,76,0.3)' }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'rgba(201,168,76,0.12)' }}>
        <BellRing size={16} style={{ color: '#C9A84C' }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-tight">Enable notifications</p>
        <p className="text-xs text-white/45 leading-tight mt-0.5">Get alerts for messages and matches</p>
      </div>

      <button
        onClick={enable}
        disabled={enabling}
        className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold text-black disabled:opacity-50 transition-opacity"
        style={{ background: '#C9A84C' }}>
        {enabling ? '…' : 'Allow'}
      </button>

      <button
        onClick={dismiss}
        className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-white/30 hover:text-white transition-colors"
        style={{ background: 'rgba(255,255,255,0.06)' }}>
        <X size={12} />
      </button>
    </div>
  )
}
