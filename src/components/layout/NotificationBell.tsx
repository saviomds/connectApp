'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Heart, MessageCircle, Star, Crown, Zap, X, CheckCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface Notif {
  id: string
  type: 'match' | 'message' | 'super_like' | 'premium' | 'profile_boost'
  data: Record<string, unknown>
  is_read: boolean
  created_at: string
  // resolved at load time
  senderName?: string
  senderAvatar?: string | null
}

const TYPE_META = {
  match:         { icon: Heart,          color: '#E8637A', label: 'New Match',   path: (d: Record<string,unknown>) => '/matches' },
  message:       { icon: MessageCircle,  color: '#4A90E2', label: 'Message',     path: (d: Record<string,unknown>) => d.conversation_id ? `/messages/${d.conversation_id}` : '/messages' },
  super_like:    { icon: Star,           color: '#C9A84C', label: 'Super Like',  path: (d: Record<string,unknown>) => '/discover' },
  premium:       { icon: Crown,          color: '#9B6DFF', label: 'Premium',     path: (d: Record<string,unknown>) => '/premium' },
  profile_boost: { icon: Zap,            color: '#2ECC71', label: 'Boost',       path: (d: Record<string,unknown>) => '/profile' },
} as const

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function notifText(n: Notif): string {
  const name = n.senderName ?? 'Someone'
  switch (n.type) {
    case 'match':         return `You matched with ${name}!`
    case 'message':       return n.data?.preview ? `${name}: ${String(n.data.preview)}` : `${name} sent you a message`
    case 'super_like':    return `${name} super liked you!`
    case 'premium':       return `Your premium subscription is active!`
    case 'profile_boost': return `Your profile boost has started!`
    default:              return 'New notification'
  }
}

export default function NotificationBell() {
  const router = useRouter()
  const supabase = createClient()

  const [open, setOpen]           = useState(false)
  const [notifs, setNotifs]       = useState<Notif[]>([])
  const [newCount, setNewCount]   = useState(0)
  const [markingRead, setMarkingRead] = useState(false)
  const channelRef                = useRef<RealtimeChannel | null>(null)
  const panelRef                  = useRef<HTMLDivElement>(null)

  const resolveProfile = useCallback(async (userId: string): Promise<{ full_name: string; avatar_url: string | null } | null> => {
    const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', userId).single()
    return data ?? null
  }, [supabase])

  const enrichNotif = useCallback(async (n: Omit<Notif, 'senderName' | 'senderAvatar'>): Promise<Notif> => {
    const senderId = (n.data?.other_user_id ?? n.data?.sender_id ?? n.data?.from_user_id) as string | undefined
    if (!senderId) return n
    const profile = await resolveProfile(senderId)
    return { ...n, senderName: profile?.full_name ?? undefined, senderAvatar: profile?.avatar_url ?? undefined }
  }, [resolveProfile])

  const load = useCallback(async () => {
    const res = await fetch('/api/notifications')
    if (!res.ok) return
    const raw: Omit<Notif, 'senderName' | 'senderAvatar'>[] = await res.json()

    // Collect unique sender IDs and batch-resolve
    const senderIds = [...new Set(
      raw.map(n => (n.data?.other_user_id ?? n.data?.sender_id ?? n.data?.from_user_id) as string).filter(Boolean)
    )]

    let profileMap: Record<string, { full_name: string; avatar_url: string | null }> = {}
    if (senderIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', senderIds)
      profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
    }

    const enriched: Notif[] = raw.map(n => {
      const sid = (n.data?.other_user_id ?? n.data?.sender_id ?? n.data?.from_user_id) as string | undefined
      const p = sid ? profileMap[sid] : null
      return { ...n, senderName: p?.full_name, senderAvatar: p?.avatar_url }
    })

    setNotifs(enriched)
    setNewCount(enriched.filter(n => !n.is_read).length)
  }, [supabase])

  useEffect(() => {
    load()

    const channel = supabase
      .channel('notif:bell')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        async payload => {
          const raw = payload.new as Omit<Notif, 'senderName' | 'senderAvatar'> & { user_id: string }
          // Only show if it's for this user
          const { data: { user } } = await supabase.auth.getUser()
          if (!user || raw.user_id !== user.id) return

          const enriched = await enrichNotif(raw)
          setNotifs(prev => [enriched, ...prev].slice(0, 50))
          setNewCount(c => c + 1)
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  async function markAllRead() {
    setMarkingRead(true)
    await fetch('/api/notifications', { method: 'PATCH' })
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    setNewCount(0)
    setMarkingRead(false)
  }

  async function handleNotifClick(n: Notif) {
    setOpen(false)

    // Mark single as read
    if (!n.is_read) {
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
      setNewCount(c => Math.max(0, c - 1))
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
    }

    const meta = TYPE_META[n.type]
    if (meta) router.push(meta.path(n.data))
  }

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-9 h-9 glass rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors relative">
        <Bell size={16} />
        {newCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full text-[9px] font-bold text-black"
            style={{ background: '#C9A84C' }}>
            {newCount > 9 ? '9+' : newCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 w-80 max-w-[calc(100vw-1rem)] glass rounded-2xl border border-white/10 shadow-2xl z-[60] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <p className="text-sm font-semibold text-white">Notifications</p>
            <div className="flex items-center gap-2">
              {newCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={markingRead}
                  className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70 transition-colors disabled:opacity-40">
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10">
                <Bell size={24} className="text-white/15" />
                <p className="text-sm text-white/30">No notifications yet</p>
              </div>
            ) : notifs.map((n, i) => {
              const meta = TYPE_META[n.type] ?? TYPE_META.match
              const Icon = meta.icon
              return (
                <button
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04] ${i < notifs.length - 1 ? 'border-b border-white/[0.04]' : ''} ${!n.is_read ? 'bg-white/[0.03]' : ''}`}>
                  {/* Avatar / icon */}
                  <div className="w-9 h-9 rounded-full shrink-0 overflow-hidden flex items-center justify-center"
                    style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}30` }}>
                    {n.senderAvatar
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={n.senderAvatar} alt="" className="w-full h-full object-cover" />
                      : <Icon size={15} style={{ color: meta.color }} />}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug break-words ${n.is_read ? 'text-white/50' : 'text-white'}`}>
                      {notifText(n)}
                    </p>
                    <p className="text-[11px] text-white/25 mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>

                  {/* Unread dot */}
                  {!n.is_read && (
                    <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: meta.color }} />
                  )}
                </button>
              )
            })}
          </div>

          {notifs.length > 0 && (
            <div className="border-t border-white/[0.06] px-4 py-2.5">
              <p className="text-xs text-white/25 text-center">
                {notifs.length} notifications · {newCount} unread
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
