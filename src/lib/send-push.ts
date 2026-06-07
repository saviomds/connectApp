import webpush from 'web-push'
import { adminSupabase } from './supabase/admin'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
}

/**
 * Send a Web Push notification to all registered devices for a user.
 * Silently removes subscriptions that have expired (HTTP 410).
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  const { data: subs } = await adminSupabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth_key')
    .eq('user_id', userId)

  if (!subs || subs.length === 0) return

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify({
          title: payload.title,
          body:  payload.body,
          url:   payload.url  ?? '/discover',
          icon:  payload.icon ?? '/icons/icon-192.png',
        })
      )
    )
  )

  // Prune stale subscriptions (410 = endpoint gone)
  const stale = results
    .map((r, i) => ({ r, sub: subs[i] }))
    .filter(({ r }) => r.status === 'rejected' && (r.reason as { statusCode?: number })?.statusCode === 410)

  await Promise.all(
    stale.map(({ sub }) =>
      adminSupabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    )
  )
}
