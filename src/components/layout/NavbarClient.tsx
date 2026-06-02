'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Heart, MessageCircle, User, Crown } from 'lucide-react';
import { clsx } from 'clsx';
import NotificationBell from './NotificationBell';

const NAV_ITEMS = [
  { href: '/discover',  label: 'Discover',  icon: Compass },
  { href: '/matches',   label: 'Matches',   icon: Heart },
  { href: '/messages',  label: 'Messages',  icon: MessageCircle },
  { href: '/profile',   label: 'Profile',   icon: User },
];

const LANDING_ROUTES = ['/', '/login', '/signup', '/verify', '/forgot-password', '/reset-password', '/onboarding'];

interface Props {
  userName: string | null;
  avatarUrl: string | null;
  unreadCount: number;
}

export default function NavbarClient({ userName, avatarUrl, unreadCount }: Props) {
  const pathname = usePathname();
  const isLanding = LANDING_ROUTES.some((r) => pathname === r || pathname.startsWith('/verify') || pathname.startsWith('/onboarding'));
  const showAppNav = !isLanding && !!userName;
  const initial = userName?.charAt(0)?.toUpperCase() ?? '?';

  const navItems = NAV_ITEMS.map((item) => ({
    ...item,
    badge: item.href === '/messages' && unreadCount > 0 ? unreadCount : undefined,
  }));

  return (
    <>
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          {/* Logo */}
          <Link href={showAppNav ? '/discover' : '/'} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gold flex items-center justify-center shadow-gold group-hover:shadow-gold-lg transition-all">
              <svg width="18" height="16" viewBox="0 0 20 18" fill="none" aria-hidden="true">
                <path d="M1.5 2C4 12 9 16 9 16C9 16 14 12 18.5 2" stroke="black" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="1.5" cy="2" r="1.5" fill="black"/>
                <circle cx="18.5" cy="2" r="1.5" fill="black"/>
              </svg>
            </div>
            <span className="font-semibold text-white tracking-tight">Vibro</span>
          </Link>

          {/* Desktop nav */}
          {showAppNav && (
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(({ href, label, icon: Icon, badge }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={clsx(
                      'relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                      active ? 'text-gold bg-gold/10' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
                    )}
                  >
                    <Icon size={16} />
                    {label}
                    {badge && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-rose rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {showAppNav ? (
              <>
                <Link href="/profile" className="hidden sm:flex items-center gap-2 px-3 py-1.5 glass rounded-full hover:bg-white/10 transition-colors">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={userName ?? ''} className="w-5 h-5 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-black shrink-0" style={{ background: '#C9A84C' }}>
                      {initial}
                    </div>
                  )}
                  <span className="text-xs text-white/70 max-w-[120px] truncate">{userName}</span>
                </Link>
                <NotificationBell />
                <Link
                  href="/premium"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold hover:opacity-80 transition-opacity"
                  style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C' }}
                >
                  <Crown size={12} />
                  Premium
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors">
                  Sign in
                </Link>
                <Link href="/signup" className="px-4 py-2 btn-gold rounded-xl text-sm font-semibold text-black">
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      {showAppNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/[0.06] md:hidden">
          <div className="flex items-center px-2 py-2">
            {navItems.map(({ href, label, icon: Icon, badge }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    'flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-colors',
                    active ? 'text-gold' : 'text-white/40 hover:text-white/70'
                  )}
                >
                  <div className="relative">
                    <Icon size={20} />
                    {badge && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose rounded-full text-[8px] font-bold text-white flex items-center justify-center">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium">{label}</span>
                  {active && <div className="w-4 h-0.5 bg-gold rounded-full" />}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
