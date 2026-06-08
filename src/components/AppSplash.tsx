'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import SplashScreen from './SplashScreen'

const SKIP_PATHS = ['/', '/login', '/signup', '/forgot-password', '/reset-password']

export default function AppSplash() {
  // Static splash: starts visible (server-rendered), fades out once React runs
  const [staticFading, setStaticFading] = useState(false)
  const [staticGone,   setStaticGone]   = useState(false)
  // Animated splash: shown on first session visit to the app
  const [showAnimated, setShowAnimated] = useState(false)

  useEffect(() => {
    const path = window.location.pathname
    const skip = SKIP_PATHS.includes(path)
      || path.startsWith('/verify')
      || path.startsWith('/onboarding')

    if (!skip && !sessionStorage.getItem('vibro_splash_done')) {
      // First visit — animated splash will take over under the fading static one
      setShowAnimated(true)
    }

    // Kick off the CSS fade-out of the static splash
    setStaticFading(true)
  }, [])

  function handleAnimatedComplete() {
    sessionStorage.setItem('vibro_splash_done', '1')
    setShowAnimated(false)
  }

  return (
    <>
      {/* Static instant splash ─────────────────────────────────────────
          Rendered server-side so it appears before JavaScript loads.
          React controls visibility via state — never touched with vanilla JS. */}
      {!staticGone && (
        <div
          aria-hidden="true"
          onTransitionEnd={() => setStaticGone(true)}
          style={{
            position: 'fixed', inset: 0, zIndex: 201,
            background: '#0A0A0B',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: '16px',
            opacity: staticFading ? 0 : 1,
            pointerEvents: staticFading ? 'none' : 'auto',
            transition: staticFading ? 'opacity 0.4s ease' : 'none',
          }}
        >
          <div style={{
            width: 96, height: 96, borderRadius: 32,
            background: 'linear-gradient(135deg,#C9A84C,#E5C76B)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px rgba(201,168,76,0.35)',
          }}>
            <svg width="48" height="43" viewBox="0 0 20 18" fill="none" aria-hidden="true">
              <path d="M1.5 2C4 12 9 16 9 16C9 16 14 12 18.5 2"
                stroke="black" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="1.5" cy="2" r="1.5" fill="black" />
              <circle cx="18.5" cy="2" r="1.5" fill="black" />
            </svg>
          </div>
          <h1 style={{ color: '#FFFFFF', fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.05em', margin: 0 }}>
            VIBRO
          </h1>
          <span style={{ color: '#C9A84C', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4em', fontWeight: 700 }}>
            Elite Discovery
          </span>
        </div>
      )}

      {/* Animated splash — first-visit only, plays under the fading static splash */}
      <AnimatePresence>
        {showAnimated && <SplashScreen onComplete={handleAnimatedComplete} />}
      </AnimatePresence>
    </>
  )
}
