import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Suspense } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { getCachedUser } from '@/lib/supabase/server'
import PresenceTracker from '@/components/PresenceTracker'
import TierUpgradeTracker from '@/components/TierUpgradeTracker'
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'
import PushPrompt from '@/components/PushPrompt'
import SessionGuard from '@/components/SessionGuard'
import ThemeScript from '@/components/ThemeScript'
import AppSplash from '@/components/AppSplash'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#C9A84C',
}

export const metadata: Metadata = {
  title: 'Vibro — Discover. Match. Grow.',
  description: 'Premium social discovery and professional networking platform.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Vibro',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-16.png', sizes: '16x16',  type: 'image/png' },
      { url: '/icons/favicon-32.png', sizes: '32x32',  type: 'image/png' },
      { url: '/icons/icon-192.png',   sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png',   sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/icons/favicon-32.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

// Thin static skeleton shown while Navbar resolves — prevents layout shift
function NavbarShell() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 pt-safe glass border-b border-white/[0.06]">
      <div className="h-16" />
    </div>
  )
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // getCachedUser() is shared with Navbar — only ONE getUser() call total per page
  const user = await getCachedUser()

  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${geist.variable} h-full`} suppressHydrationWarning>
      <head><ThemeScript /></head>
      <body className="min-h-full bg-bg-primary text-text-primary">

        {/* ── Zero-JS instant splash ────────────────────────────────────
            Rendered in the initial HTML before JavaScript loads.
            AppSplash fades it out once React is ready.            ── */}
        <div
          id="vibro-launch"
          aria-hidden="true"
          style={{
            position: 'fixed', inset: 0, zIndex: 201,
            background: '#0A0A0B',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: '16px',
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
          <h1 style={{ color: '#FFFFFF', fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.05em', margin: 0 }}>VIBRO</h1>
          <span style={{ color: '#C9A84C', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4em', fontWeight: 700 }}>Elite Discovery</span>
        </div>

        <AppSplash />
        <Suspense fallback={<NavbarShell />}>
          <Navbar />
        </Suspense>
        <SessionGuard />
        {user && <PresenceTracker />}
        {user && <TierUpgradeTracker userId={user.id} />}
        <ServiceWorkerRegistrar />
        {user && <PushPrompt />}
        {children}
      </body>
    </html>
  )
}
