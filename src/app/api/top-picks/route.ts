import { createClient } from '@/lib/supabase/server'
import { getCachedUser } from '@/lib/supabase/server'

// Daily top picks — computed fresh from compatible profiles.
// Score = is_verified(3) + is_premium(1) + active_7d(2) + interest_overlap
export async function GET() {
  const user = await getCachedUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()

  const [{ data: meRow }, { data: swipedRows }, { data: blockedRows }] = await Promise.all([
    supabase.from('profiles').select('interests, show_gender, is_premium').eq('id', user.id).single(),
    supabase.from('swipes').select('target_id').eq('swiper_id', user.id).limit(500),
    supabase.from('blocks').select('blocked_id, blocker_id'),
  ])

  const myInterests = new Set<string>(meRow?.interests ?? [])
  const excludeIds = new Set([
    user.id,
    ...(swipedRows  ?? []).map((r: { target_id: string }) => r.target_id),
    ...(blockedRows ?? []).flatMap((r: { blocked_id: string; blocker_id: string }) => [r.blocked_id, r.blocker_id]),
  ])

  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()

  let query = supabase
    .from('profiles')
    .select('id, full_name, avatar_url, photos, profession, company, city, country, age, is_verified, is_online, is_premium, premium_tier, free_tonight, interests, bio, prompts, updated_at')
    .eq('onboarding_completed', true)
    .eq('is_suspended', false)
    .gte('updated_at', sevenDaysAgo)
    .limit(80)

  const gender = meRow?.show_gender
  if (gender && gender !== 'everyone') query = query.eq('gender', gender)

  const { data: candidates } = await query

  const scored = (candidates ?? [])
    .filter((p: { id: string }) => !excludeIds.has(p.id))
    .map((p: { id: string; is_verified: boolean; is_premium: boolean; is_online: boolean; interests: string[]; updated_at: string }) => {
      const overlap = (p.interests ?? []).filter((i: string) => myInterests.has(i)).length
      const score =
        (p.is_verified ? 3 : 0) +
        (p.is_premium  ? 1 : 0) +
        (p.is_online   ? 2 : 0) +
        overlap
      return { ...p, _score: score }
    })
    .sort((a: { _score: number }, b: { _score: number }) => b._score - a._score)
    .slice(0, 10)

  return Response.json({ picks: scored, isPremium: meRow?.is_premium ?? false })
}
