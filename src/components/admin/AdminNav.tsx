'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Users, ShieldAlert, Settings, Home, ShieldCheck } from 'lucide-react'
import { clsx } from 'clsx'

const NAV = [
  { href: '/admin',               label: 'Overview',      icon: BarChart3,   exact: true },
  { href: '/admin/users',         label: 'Users',         icon: Users,       exact: false },
  { href: '/admin/verifications', label: 'Verify',        icon: ShieldCheck, exact: false },
  { href: '/admin/reports',       label: 'Reports',       icon: ShieldAlert, exact: false },
  { href: '/admin/settings',      label: 'Settings',      icon: Settings,    exact: false },
]

export default function AdminNav({ email }: { email: string }) {
  const pathname = usePathname()

  function active(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  return (
    <>
      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 fixed top-16 bottom-0 left-0 z-40 px-3 py-5" style={{ background: '#13131A', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2 px-3 mb-5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Admin Panel</p>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const on = active(href, exact)
            return (
              <Link
                key={href}
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
          })}
        </nav>

        <div className="mt-auto">
          <Link href="/discover"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-white/30 hover:text-white transition-colors">
            <Home size={15} /> Back to app
          </Link>
          <p className="text-[10px] text-white/20 px-3 mt-2 truncate">{email}</p>
        </div>
      </aside>

      {/* ── Mobile top strip ── */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-40 flex items-center gap-1 px-3 py-2 overflow-x-auto" style={{ background: '#13131A', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const on = active(href, exact)
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                on ? 'text-black' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
              )}
              style={on ? { background: '#C9A84C' } : {}}
            >
              <Icon size={13} style={on ? { color: 'black' } : {}} />
              {label}
            </Link>
          )
        })}
      </div>
    </>
  )
}
