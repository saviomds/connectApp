'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-nav-flush">
      <div className="w-full max-w-sm text-center animate-fade-up">

        {/* Icon */}
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(231,76,60,0.10)', border: '1px solid rgba(231,76,60,0.20)' }}
        >
          <AlertTriangle size={36} style={{ color: '#E74C3C' }} />
        </div>

        {/* Copy */}
        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-white/45 text-sm leading-relaxed mb-8">
          An unexpected error occurred. Try refreshing — if the problem persists, come back shortly.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full h-12 btn-gold rounded-2xl font-semibold text-black flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} /> Try again
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full h-12 glass rounded-2xl text-sm font-medium text-white/60 hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <Home size={15} /> Go home
          </button>
        </div>

        {/* Digest (dev only) */}
        {error.digest && (
          <p className="mt-6 text-[10px] text-white/20 font-mono">ref: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
