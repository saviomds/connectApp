'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Crown, CheckCircle } from 'lucide-react'

function SuccessContent() {
  const router = useRouter()
  const params = useSearchParams()
  const sessionId = params.get('session_id')

  useEffect(() => {
    // Refresh the session so the profile re-renders with premium status
    if (sessionId) router.refresh()
  }, [sessionId, router])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16">
      <div className="w-full max-w-md text-center animate-fade-up">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(201,168,76,0.15)', border: '2px solid rgba(201,168,76,0.4)' }}>
          <Crown size={40} style={{ color: '#C9A84C', fill: '#C9A84C' }} />
        </div>

        <CheckCircle size={24} className="mx-auto mb-4" style={{ color: '#2ECC71' }} />
        <h1 className="text-3xl font-bold text-white mb-3">Welcome to Premium!</h1>
        <p className="text-white/50 mb-8 leading-relaxed">
          Your subscription is now active. All premium features are unlocked — enjoy unlimited likes, profile boosts, and more.
        </p>

        <div className="flex gap-3 justify-center">
          <Link href="/discover" className="btn-gold px-8 py-3 rounded-2xl font-bold text-black">
            Start Discovering
          </Link>
          <Link href="/profile" className="glass px-6 py-3 rounded-2xl text-white/70 hover:text-white font-medium transition-colors">
            View Profile
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function PremiumSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white/50">Loading…</div>}>
      <SuccessContent />
    </Suspense>
  )
}
