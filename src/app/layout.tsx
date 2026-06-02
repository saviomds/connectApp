import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Suspense } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { getCachedUser } from '@/lib/supabase/server'
import PresenceTracker from '@/components/PresenceTracker'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

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
    <div className="fixed top-0 left-0 right-0 z-50 h-16 glass border-b border-white/[0.06]" />
  )
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // getCachedUser() is shared with Navbar — only ONE getUser() call total per page
  const user = await getCachedUser()

  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${geist.variable} h-full`}>
      <head>
        <meta name="theme-color" content="#C9A84C" />
        <meta name="color-scheme" content="dark" />
      </head>
      <body className="min-h-full bg-bg-primary text-text-primary">
        <Suspense fallback={<NavbarShell />}>
          <Navbar />
        </Suspense>
        {user && <PresenceTracker />}
        {children}
      </body>
    </html>
  )
}
