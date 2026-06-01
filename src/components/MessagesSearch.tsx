'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, BadgeCheck } from 'lucide-react'
import { clsx } from 'clsx'

interface ConvRow {
  id: string
  lastMessage: string
  lastTime: Date | string
  unread: number
  profile: { name: string; photo: string; isOnline: boolean; isVerified: boolean }
}

function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export default function MessagesSearch({ conversations }: { conversations: ConvRow[] }) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? conversations.filter((c) =>
        c.profile.name.toLowerCase().includes(query.toLowerCase()) ||
        c.lastMessage.toLowerCase().includes(query.toLowerCase())
      )
    : conversations

  return (
    <>
      <div className="relative mb-5">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations…"
          className="w-full h-11 pl-9 pr-4 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus"
        />
      </div>

      <div className="flex flex-col divide-y divide-white/[0.05]">
        {filtered.length === 0 ? (
          <p className="text-center text-white/30 py-8 text-sm">No conversations found</p>
        ) : (
          filtered.map(({ id, profile, lastMessage, lastTime, unread }) => (
            <Link key={id} href={`/messages/${id}`}
              className="flex items-center gap-3.5 py-4 hover:bg-white/[0.03] -mx-2 px-2 rounded-2xl transition-colors group">
              <div className="relative shrink-0">
                {profile.photo ? (
                  <Image src={profile.photo} alt={profile.name} width={52} height={52}
                    className="rounded-full object-cover" style={{ width: 52, height: 52 }} />
                ) : (
                  <div className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-lg font-bold"
                    style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}>
                    {profile.name.charAt(0)}
                  </div>
                )}
                {profile.isOnline && (
                  <div className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-[#0A0A0B] pulse-dot"
                    style={{ background: '#2ECC71' }} />
                )}
                {unread > 0 && (
                  <div className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-black px-1"
                    style={{ background: '#C9A84C' }}>
                    {unread}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={clsx('font-semibold text-sm', unread > 0 ? 'text-white' : 'text-white/80')}>
                    {profile.name}
                  </span>
                  {profile.isVerified && <BadgeCheck size={13} className="fill-blue-400 text-white shrink-0" />}
                  <span className="ml-auto text-xs text-white/30 shrink-0">{timeAgo(lastTime)}</span>
                </div>
                <p className={clsx('text-sm truncate', unread > 0 ? 'text-white/70 font-medium' : 'text-white/40')}>
                  {lastMessage}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  )
}
