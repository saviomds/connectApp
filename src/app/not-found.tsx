import Link from 'next/link'
import { Compass, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-nav-flush">
      <div className="w-full max-w-sm text-center animate-fade-up">

        {/* Number */}
        <div className="relative mb-6 select-none">
          <span
            className="text-[9rem] font-black leading-none"
            style={{
              background: 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.04))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            404
          </span>
          <div
            className="absolute inset-x-0 bottom-2 mx-auto w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)' }}
          >
            <Compass size={28} style={{ color: '#C9A84C' }} />
          </div>
        </div>

        {/* Copy */}
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-white/45 text-sm leading-relaxed mb-8">
          This page doesn&apos;t exist or was moved. Let&apos;s get you back on track.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href="/discover"
            className="w-full h-12 btn-gold rounded-2xl font-semibold text-black flex items-center justify-center gap-2"
          >
            <Compass size={16} /> Go to Discover
          </Link>
          <Link
            href="/"
            className="w-full h-12 glass rounded-2xl text-sm font-medium text-white/60 hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <Home size={15} /> Home
          </Link>
        </div>
      </div>
    </div>
  )
}
