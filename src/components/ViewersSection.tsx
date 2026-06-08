'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Eye, Lock, Crown } from 'lucide-react'

interface Viewer {
  id: string
  full_name: string
  avatar_url: string | null
  profession: string | null
  viewed_at: string
}

interface Props {
  isPremium: boolean
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function ViewersSection({ isPremium }: Props) {
  const [data, setData]       = useState<{ total: number; last30: number; viewers: Viewer[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/profile/viewers')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data || (data.total === 0 && data.viewers.length === 0)) return null

  return (
    <div className="glass rounded-3xl p-5 border border-white/[0.07]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Eye size={15} className="text-white/40" />
          <h2 className="text-sm font-bold text-white">Who Viewed You</h2>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(74,144,226,0.12)', color: '#4A90E2', border: '1px solid rgba(74,144,226,0.2)' }}>
          {data.last30} this month
        </span>
      </div>

      {isPremium ? (
        data.viewers.length === 0 ? (
          <p className="text-xs text-white/30 text-center py-4">No views yet — share your profile to get discovered!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.viewers.map(v => (
              <Link key={v.id} href={`/matches?search=${encodeURIComponent(v.full_name)}`}
                className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/[0.04] transition-colors group">
                <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 bg-white/[0.06]">
                  {v.avatar_url ? (
                    <Image src={v.avatar_url} alt={v.full_name} fill className="object-cover" sizes="36px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ color: '#C9A84C' }}>
                      {v.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{v.full_name}</p>
                  {v.profession && <p className="text-xs text-white/35 truncate">{v.profession}</p>}
                </div>
                <span className="text-[10px] text-white/25 shrink-0">{timeAgo(v.viewed_at)}</span>
              </Link>
            ))}
          </div>
        )
      ) : (
        <div className="relative">
          {/* Blurred preview rows */}
          <div className="flex flex-col gap-2 pointer-events-none select-none" style={{ filter: 'blur(6px)', opacity: 0.4 }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 p-2.5">
                <div className="w-9 h-9 rounded-full shrink-0" style={{ background: `rgba(201,168,76,${0.1 + i * 0.05})` }} />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 rounded-full w-24" style={{ background: 'rgba(255,255,255,0.1)' }} />
                  <div className="h-2.5 rounded-full w-16" style={{ background: 'rgba(255,255,255,0.06)' }} />
                </div>
              </div>
            ))}
          </div>
          {/* Lock overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}>
              <Lock size={16} style={{ color: '#C9A84C' }} />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-white mb-0.5">Premium feature</p>
              <p className="text-[10px] text-white/40">{data.total} people have viewed your profile</p>
            </div>
            <Link href="/premium"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-black mt-1"
              style={{ background: 'linear-gradient(135deg,#C9A84C,#E5C76B)' }}>
              <Crown size={11} /> Unlock
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
