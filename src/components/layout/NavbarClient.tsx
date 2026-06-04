'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Heart, MessageCircle, User, Crown, Grid2x2, Star } from 'lucide-react';
import { clsx } from 'clsx';
import NotificationBell from './NotificationBell';

const LANDING_ROUTES = ['/', '/login', '/signup', '/verify', '/forgot-password', '/reset-password', '/onboarding'];

interface Props {
  userName: string | null;
  avatarUrl: string | null;
  unreadCount: number;
  likedYouCount: number;
}

export default function NavbarClient({ userName, avatarUrl, unreadCount, likedYouCount }: Props) {
  const pathname = usePathname();
  const isLanding = LANDING_ROUTES.some((r) => pathname === r || pathname.startsWith('/verify') || pathname.startsWith('/onboarding'));
  const showAppNav = !isLanding && !!userName;
  const initial = userName?.charAt(0)?.toUpperCase() ?? '?';

  const navItems = [
    { href: '/discover',   label: 'Discover',  icon: Compass,       badge: 0 },
    { href: '/explore',    label: 'Explore',   icon: Grid2x2,       badge: 0 },
    { href: '/matches',    label: 'Matches',   icon: Heart,         badge: likedYouCount },
    { href: '/messages',   label: 'Messages',  icon: MessageCircle, badge: unreadCount },
    { href: '/profile',    label: 'Profile',   icon: User,          badge: 0 },
  ];

  return (
    <>
      {/* ── Top bar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/[0.06] pt-safe">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 min-h-16 h-16">
          {/* Logo */}
          <Link href={showAppNav ? '/discover' : '/'} className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gold flex items-center justify-center shadow-gold group-hover:shadow-gold-lg transition-all shrink-0">
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
                    {badge > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-pop"
                        style={{ background: href === '/matches' ? '#E8637A' : '#E8637A' }}>
                        {badge > 99 ? '99+' : badge > 9 ? '9+' : badge}
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
                {/* Avatar pill — hidden on very small screens */}
                <Link href="/profile" className="hidden sm:flex items-center gap-2 px-3 py-1.5 glass rounded-full hover:bg-white/10 transition-colors">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={userName ?? ''} className="w-5 h-5 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-black shrink-0" style={{ background: '#C9A84C' }}>
                      {initial}
                    </div>
                  )}
                  <span className="text-xs text-white/70 max-w-[100px] truncate">{userName}</span>
                </Link>

                <NotificationBell />

                <Link href="/top-picks"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold hover:opacity-80 transition-opacity"
                  style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.18)', color: '#C9A84C' }}>
                  <Star size={12} />
                  Top Picks
                </Link>
                <Link href="/double-date"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold hover:opacity-80 transition-opacity"
                  style={{ background: 'rgba(232,99,122,0.08)', border: '1px solid rgba(232,99,122,0.18)', color: '#E8637A' }}>
                  ❤️ Double Date
                </Link>
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

      {/* ── Mobile bottom nav (Instagram-style) ── */}
      {showAppNav && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
          style={{
            background: '#0A0A0B',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          <div className="flex items-center h-[54px]">
            {navItems.map(({ href, label, icon: Icon, badge }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex-1 flex flex-col items-center justify-center gap-[3px] h-full relative select-none"
                >
                  {/* Icon wrapper */}
                  <div className="relative flex items-center justify-center">
                    {/* Active pill background */}
                    {active && (
                      <span
                        className="absolute inset-[-6px_-10px] rounded-2xl"
                        style={{ background: 'rgba(201,168,76,0.10)' }}
                      />
                    )}
                    <Icon
                      size={22}
                      strokeWidth={active ? 2.3 : 1.6}
                      className={clsx(
                        'relative transition-all duration-150',
                        active ? 'text-gold drop-shadow-[0_0_6px_rgba(201,168,76,0.5)]' : 'text-white/40'
                      )}
                    />
                    {/* Badge */}
                    {badge > 0 && (
                      <span
                        className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] px-[3px] rounded-full text-[8px] font-black text-white flex items-center justify-center animate-pop leading-none"
                        style={{ background: '#E8637A', boxShadow: '0 0 0 2px #0A0A0B' }}
                      >
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </div>
                  {/* Label */}
                  <span
                    className={clsx(
                      'text-[10px] font-medium leading-none transition-all duration-150',
                      active ? 'text-gold' : 'text-white/30'
                    )}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
