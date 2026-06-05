'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import SplashScreen from './SplashScreen'

const LANDING = ['/', '/login', '/signup', '/verify', '/forgot-password', '/reset-password', '/onboarding']

export default function AppSplash() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const path = window.location.pathname
    const isLanding = LANDING.some(p => path === p || path.startsWith('/verify') || path.startsWith('/onboarding'))
    if (isLanding) return

    // Show once per session (sessionStorage clears on tab close)
    if (!sessionStorage.getItem('vibro_splash_done')) {
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
