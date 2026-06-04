import { createClient } from '@/lib/supabase/server'
import { getCachedUser } from '@/lib/supabase/server'

// Double Date: surface matched couples who are also looking for a double date.
// "Couple" = two users who are matched with each other and both have double_date_active = true.

export async function GET() {
  const user = await getCachedUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()

  // Get current user's matches
  const { data: myMatches } = await supabase
    .from('matches')
    .select('id, user1_id, user2_id')
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

  const myMatchedIds = (myMatches ?? []).map((m: { user1_id: string; user2_id: string }) =>
    m.user1_id === user.id ? m.user2_id : m.user1_id
  )

  // Find other couples who are looking for a double date
  const { data: candidateMatches } = await supabase
    .from('matches')
    .select('id, user1_id, user2_id, user1:profiles!matches_user1_id_fkey(id, full_name, avatar_url, photos, city, country, age, profession, is_verified, is_premium, premium_tier, double_date_active), user2:profiles!matches_user2_id_fkey(id, full_name, avatar_url, photos, city, country, age, profession, is_verified, is_premium, premium_tier, double_date_active)')
    .neq('user1_id', user.id)
    .neq('user2_id', user.id)
    .limit(30)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const couples = (candidateMatches ?? []).filter((m: any) => {
    const u1 = Array.isArray(m.user1) ? m.user1[0] : m.user1
    const u2 = Array.isArray(m.user2) ? m.user2[0] : m.user2
    const bothActive = u1?.double_date_active && u2?.double_date_active
    const notMyMatch = !myMatchedIds.includes(m.user1_id) && !myMatchedIds.includes(m.user2_id)
    return bothActive && notMyMatch
  })

  return Response.json({ couples, myMatchedIds })
}

export async function PATCH(request: Request) {
  const user = await getCachedUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { active } = await request.json() as { active: boolean }
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ double_date_active: active })
    .eq('id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true, double_date_active: active })
}
