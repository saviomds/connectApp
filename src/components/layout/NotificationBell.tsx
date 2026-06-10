'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Heart, MessageCircle, Star, Crown, Zap, X, CheckCheck, Trash2, BellRing } from 'lucide-react'
import { requestAndSubscribePush } from '@/components/ServiceWorkerRegistrar'
import { createClient } from '@/lib/supabase/client'
import { playMatchSound, playSuperLikeSound, playNotificationSound } from '@/lib/sounds'
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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [clearingAll, setClearingAll] = useState(false)
  const [pushPermission, setPushPermission] = useState<NotificationPermission | null>(null)
  const [enablingPush, setEnablingPush] = useState(false)
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

  // Check push permission state whenever the panel opens
  useEffect(() => {
    if (open && 'Notification' in window) {
      setPushPermission(Notification.permission)
    }
  }, [open])

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

          if (enriched.type === 'match')      playMatchSound()
          else if (enriched.type === 'super_like') playSuperLikeSound()
          else if (enriched.type !== 'message')    playNotificationSound()
          // 'message' type is handled by ChatPage's own message sound

          // Show system notification when tab is in background
          if (document.hidden && 'serviceWorker' in navigator) {
            const meta = TYPE_META[enriched.type as keyof typeof TYPE_META] ?? TYPE_META.match
            navigator.serviceWorker.ready.then(reg => {
              reg.active?.postMessage({
                type: 'SHOW_NOTIFICATION',
                title: `Vibro — ${meta.label}`,
                body: notifText(enriched),
                url: meta.path(enriched.data),
              })
            }).catch(() => {})
          }
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

    if (!n.is_read) {
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
      setNewCount(c => Math.max(0, c - 1))
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
    }

    const meta = TYPE_META[n.type]
    if (meta) router.push(meta.path(n.data))
  }

  async function deleteOne(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    setDeletingId(id)
    await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' })
    setNotifs(prev => {
      const next = prev.filter(n => n.id !== id)
      setNewCount(next.filter(n => !n.is_read).length)
      return next
    })
    setDeletingId(null)
  }

  async function clearAll() {
    setClearingAll(true)
    const res = await fetch('/api/notifications', { method: 'DELETE' })
    if (res.ok) {
      setNotifs([])
      setNewCount(0)
    }
    setClearingAll(false)
  }

  async function enablePush() {
    setEnablingPush(true)
    const result = await requestAndSubscribePush()
    setPushPermission(result === 'granted' ? 'granted' : result === 'denied' ? 'denied' : pushPermission)
    setEnablingPush(false)
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
        <div className="absolute right-0 top-11 w-80 max-w-[calc(100vw-1rem)] modal rounded-2xl z-[60] overflow-hidden">
          {/* Accent line */}
          <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)' }} />

          {/* Header */}
          <div className="modal-header flex items-center justify-between px-4 py-3">
            <p className="text-sm font-bold text-white">Notifications</p>
            <div className="flex items-center gap-3">
              {newCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={markingRead}
                  className="flex items-center gap-1 text-[11px] font-medium text-white/50 hover:text-white transition-colors disabled:opacity-40">
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
              {notifs.length > 0 && (
                <button
                  onClick={clearAll}
                  disabled={clearingAll}
                  className="flex items-center gap-1 text-[11px] font-medium text-white/50 hover:text-red-400 transition-colors disabled:opacity-40">
                  <Trash2 size={12} /> Clear all
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-white/40 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.07)' }}>
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Push notification prompt */}
          {pushPermission !== null && pushPermission !== 'granted' && pushPermission !== 'denied' && (
            <div className="mx-3 mb-2 mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5"
              style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.18)' }}>
              <BellRing size={14} style={{ color: '#C9A84C', flexShrink: 0 }} />
              <p className="text-[11px] text-white/60 flex-1 leading-tight">
                Enable push notifications to get alerts on your phone
              </p>
              <button
                onClick={enablePush}
                disabled={enablingPush}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40"
                style={{ background: '#C9A84C', color: '#0A0A0B' }}>
                {enablingPush ? '…' : 'Enable'}
              </button>
            </div>
          )}

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <Bell size={20} className="text-white/20" />
                </div>
                <p className="text-sm text-white/40 font-medium">No notifications yet</p>
                <p className="text-xs text-white/25">We&apos;ll notify you when something happens</p>
              </div>
            ) : notifs.map((n, i) => {
              const meta = TYPE_META[n.type] ?? TYPE_META.match
              const Icon = meta.icon
              return (
                <div
                  key={n.id}
                  className={`group relative flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.05] ${i < notifs.length - 1 ? 'border-b border-white/[0.05]' : ''}`}
                  style={!n.is_read ? { background: 'rgba(201,168,76,0.04)' } : {}}>

                  {/* Clickable area */}
                  <button
                    onClick={() => handleNotifClick(n)}
                    className="absolute inset-0 z-0"
                    aria-label={notifText(n)}
                  />

                  {/* Avatar / icon */}
                  <div className="relative z-10 w-9 h-9 rounded-full shrink-0 overflow-hidden flex items-center justify-center pointer-events-none"
                    style={{ background: `${meta.color}20`, border: `1.5px solid ${meta.color}40` }}>
                    {n.senderAvatar
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={n.senderAvatar} alt="" className="w-full h-full object-cover" />
                      : <Icon size={15} style={{ color: meta.color }} />}
                  </div>

                  {/* Text */}
                  <div className="relative z-10 flex-1 min-w-0 pointer-events-none">
                    <p className={`text-sm leading-snug break-words font-medium ${n.is_read ? 'text-white/60' : 'text-white'}`}>
                      {notifText(n)}
                    </p>
                    <p className="text-[11px] text-white/35 mt-1">{timeAgo(n.created_at)}</p>
                  </div>

                  {/* Right side: unread dot / delete button */}
                  <div className="relative z-10 flex items-center shrink-0 mt-1 h-6">
                    {/* Unread dot — hidden on hover to show trash */}
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full group-hover:hidden" style={{ background: meta.color }} />
                    )}
                    {/* Delete button — always visible on hover */}
                    <button
                      onClick={e => deleteOne(e, n.id)}
                      disabled={deletingId === n.id}
                      className="hidden group-hover:flex w-6 h-6 rounded-lg items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                      aria-label="Delete notification">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {notifs.length > 0 && (
            <div className="modal-header border-t-0 px-4 py-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs text-white/35 text-center">
                {notifs.length} notifications · <span style={{ color: newCount > 0 ? '#C9A84C' : 'inherit' }}>{newCount} unread</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
