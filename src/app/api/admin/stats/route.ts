import { getAdminUser } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  // Use the admin's own session — is_admin() RLS lets them see all rows
  const supabase = await createClient()

  const now = new Date()
  const yesterday    = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const twoMinsAgo   = new Date(now.getTime() - 2  * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000)

  const [
    rTotal, rNew24h, rPremium, rSuspended,
    rMatches, rMessages, rOnline, rActive, rVerified,
    rNewMatches, rNewMsgs, rBlocked,
    rRecentProfiles, rRecentUsers,
  ] = await Promise.allSettled([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', yesterday.toISOString()),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_premium', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_suspended', true),
    supabase.from('matches').select('*', { count: 'exact', head: true }),
    supabase.from('messages').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_online', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gt('last_seen_at', twoMinsAgo.toISOString()),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_verified', true),
    supabase.from('matches').select('*', { count: 'exact', head: true }).gte('created_at', yesterday.toISOString()),
    supabase.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', yesterday.toISOString()),
    // blocks: works after admin_grants.sql adds is_admin() policy
    supabase.from('blocks').select('*', { count: 'exact', head: true }),
    // chart data
    supabase.from('profiles').select('created_at').gte('created_at', sevenDaysAgo.toISOString()).order('created_at', { ascending: true }),
    // recent signups
    supabase.from('profiles')
      .select('id, full_name, avatar_url, profession, category, is_premium, premium_tier, created_at')
      .order('created_at', { ascending: false }).limit(10),
  ])

  function cnt(r: PromiseSettledResult<{ count: number | null }>): number {
    return r.status === 'fulfilled' ? (r.value.count ?? 0) : 0
  }
  function dat<T>(r: PromiseSettledResult<{ data: T | null }>): T | null {
    return r.status === 'fulfilled' ? (r.value.data ?? null) : null
  }

  // Build daily signups chart (last 7 days)
  const dayLabels: string[] = []
  const dayMap: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    dayLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }))
    dayMap[key] = 0
  }
  const recentProfilesData = dat<{ created_at: string }[]>(
    rRecentProfiles as PromiseSettledResult<{ data: { created_at: string }[] | null }>
  )
  for (const p of recentProfilesData ?? []) {
    const key = new Date(p.created_at).toISOString().slice(0, 10)
    if (key in dayMap) dayMap[key]++
  }
  const dailySignups = Object.entries(dayMap).map(([date, c], i) => ({
    date, label: dayLabels[i], count: c, isToday: i === 6,
  }))

  return Response.json({
    total_users:      cnt(rTotal     as PromiseSettledResult<{ count: number | null }>),
    new_users_24h:    cnt(rNew24h    as PromiseSettledResult<{ count: number | null }>),
    premium_users:    cnt(rPremium   as PromiseSettledResult<{ count: number | null }>),
    suspended_users:  cnt(rSuspended as PromiseSettledResult<{ count: number | null }>),
    total_matches:    cnt(rMatches   as PromiseSettledResult<{ count: number | null }>),
    total_messages:   cnt(rMessages  as PromiseSettledResult<{ count: number | null }>),
    online_now:       cnt(rOnline    as PromiseSettledResult<{ count: number | null }>),
    active_now:       cnt(rActive    as PromiseSettledResult<{ count: number | null }>),
    verified_users:   cnt(rVerified  as PromiseSettledResult<{ count: number | null }>),
    new_matches_24h:  cnt(rNewMatches as PromiseSettledResult<{ count: number | null }>),
    new_messages_24h: cnt(rNewMsgs   as PromiseSettledResult<{ count: number | null }>),
    total_blocked:    cnt(rBlocked   as PromiseSettledResult<{ count: number | null }>),
    daily_signups:    dailySignups,
    recent_users:     dat(rRecentUsers as PromiseSettledResult<{ data: unknown[] | null }>) ?? [],
  })
}
