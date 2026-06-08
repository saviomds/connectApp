'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3, Users, ShieldAlert, Settings, Home,
  ShieldCheck, Heart, MessageCircle, Menu, X, Banknote,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useState, useEffect } from 'react'

const NAV = [
  { href: '/admin',               label: 'Overview',     icon: BarChart3,       exact: true  },
  { href: '/admin/users',         label: 'Users',        icon: Users,           exact: false },
  { href: '/admin/matches',       label: 'Matches',      icon: Heart,           exact: false },
  { href: '/admin/messages',      label: 'Messages',     icon: MessageCircle,   exact: false },
  { href: '/admin/verifications',   label: 'Verify',       icon: ShieldCheck,     exact: false },
  { href: '/admin/reports',        label: 'Reports',      icon: ShieldAlert,     exact: false },
  { href: '/admin/juice-payments', label: 'Payments',     icon: Banknote,        exact: false },
  { href: '/admin/settings',       label: 'Settings',     icon: Settings,        exact: false },
]

export default function AdminNav({ email }: { email: string }) {
  const pathname    = usePathname()
  const [open, setOpen] = useState(false)

  // Close drawer on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  function active(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  const NavLink = ({ href, label, icon: Icon, exact }: typeof NAV[number]) => {
    const on = active(href, exact)
    return (
      <Link
        href={href}
        className={clsx(
          'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
          on ? 'text-black' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
        )}
        style={on ? { background: '#C9A84C' } : {}}
      >
        <Icon size={15} style={on ? { color: 'black' } : {}} />
        {label}
      </Link>
    )
  }

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col w-56 shrink-0 fixed top-16 bottom-0 left-0 z-40 px-3 py-5"
        style={{ background: 'var(--app-modal)', borderRight: '1px solid var(--app-border)' }}
      >
        <div className="flex items-center gap-2 px-3 mb-5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Admin Panel</p>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map(item => <NavLink key={item.href} {...item} />)}
        </nav>

        <div className="mt-auto">
          <Link href="/discover"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-white/30 hover:text-white transition-colors">
            <Home size={15} /> Back to app
          </Link>
          <p className="text-[10px] text-white/20 px-3 mt-2 truncate">{email}</p>
        </div>
      </aside>

      {/* ── Mobile top bar with hamburger ───────────────────── */}
      <div
        className="md:hidden fixed top-16 left-0 right-0 z-40 flex items-center justify-between px-4 py-3"
        style={{ background: 'var(--app-modal)', borderBottom: '1px solid var(--app-border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <p className="text-xs font-bold uppercase tracking-widest text-white/50">Admin Panel</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-xl glass text-white/60 hover:text-white transition-colors"
          aria-label="Open admin menu"
        >
          <Menu size={18} />
        </button>
      </div>

      {/* ── Mobile drawer overlay ────────────────────────────── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile slide-in drawer ───────────────────────────── */}
      <div
        className={clsx(
          'md:hidden fixed top-0 right-0 bottom-0 z-50 w-72 flex flex-col py-6 px-4 transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ background: 'var(--app-modal)', borderLeft: '1px solid var(--app-border)' }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <p className="text-sm font-bold text-white">Admin Panel</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-xl glass text-white/40 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map(item => <NavLink key={item.href} {...item} />)}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/[0.06] pt-4 mt-4">
          <Link href="/discover"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-white transition-colors">
            <Home size={15} /> Back to app
          </Link>
          <p className="text-[10px] text-white/20 px-3 mt-3 truncate">{email}</p>
        </div>
      </div>
    </>
  )
}
