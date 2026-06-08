'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import SplashScreen from './SplashScreen'

const SKIP_PATHS = ['/', '/login', '/signup', '/forgot-password', '/reset-password']

export default function AppSplash() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const path = window.location.pathname
    const skip = SKIP_PATHS.includes(path)
      || path.startsWith('/verify')
      || path.startsWith('/onboarding')

    // Always fade out the static HTML splash that was rendered server-side
    const el = document.getElementById('vibro-launch')
    if (el) {
      if (skip || sessionStorage.getItem('vibro_splash_done')) {
        // Fast removal — no animated splash will follow
        el.style.transition = 'opacity 0.25s ease'
        el.style.opacity = '0'
        el.style.pointerEvents = 'none'
        setTimeout(() => { try { el.remove() } catch { /* ignore */ } }, 280)
      } else {
        // Animated splash will appear underneath; let them overlap during fade
        el.style.transition = 'opacity 0.45s ease'
        el.style.opacity = '0'
        el.style.pointerEvents = 'none'
        setTimeout(() => { try { el.remove() } catch { /* ignore */ } }, 500)
        setShow(true)
      }
    } else if (!skip && !sessionStorage.getItem('vibro_splash_done')) {
      // Static splash already gone (e.g. dev HMR) — just show animated
      setShow(true)
    }
  }, [])

  function handleComplete() {
    sessionStorage.setItem('vibro_splash_done', '1')
    setShow(false)
  }

  return (
    <AnimatePresence>
      {show && <SplashScreen onComplete={handleComplete} />}
    </AnimatePresence>
  )
}
