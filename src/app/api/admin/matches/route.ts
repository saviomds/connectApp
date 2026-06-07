import { getAdminUser } from '@/lib/admin'
import { adminSupabase } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const admin = await getAdminUser()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit  = 20
  const search = searchParams.get('search') ?? ''
  const tab    = searchParams.get('tab') ?? 'matches'  // 'matches' | 'double_dates' | 'company'

  if (tab === 'double_dates') {
    // Users who opted into double dating
    let q = adminSupabase
      .from('profiles')
      .select('id, full_name, avatar_url, profession, company, city, country, category, is_premium, premium_tier, is_verified, double_date_active', { count: 'exact' })
      .eq('onboarding_completed', true)
      .eq('is_suspended', false)
      .eq('double_date_active', true)
      .order('updated_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (search) {
      q = q.or(`full_name.ilike.%${search}%,profession.ilike.%${search}%`)
    }

    const { data, count, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ users: data ?? [], total: count ?? 0, page })
  }

  if (tab === 'company') {
    // Company category profiles
    let q = adminSupabase
      .from('profiles')
      .select('id, full_name, avatar_url, profession, company, city, country, category, is_premium, premium_tier, is_verified, website, bio', { count: 'exact' })
      .eq('category', 'company')
      .eq('onboarding_completed', true)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (search) {
      q = q.or(`full_name.ilike.%${search}%,company.ilike.%${search}%,profession.ilike.%${search}%`)
    }

    const { data, count, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ companies: data ?? [], total: count ?? 0, page })
  }

  // Default: all matches
  const { data: matches, count, error } = await adminSupabase
    .from('matches')
    .select('id, user1_id, user2_id, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  if (!matches || matches.length === 0) {
    return Response.json({ matches: [], total: count ?? 0, page })
  }

  // Enrich with user profiles
  const userIds = [...new Set(matches.flatMap(m => [m.user1_id, m.user2_id]))]
  const { data: profiles } = await adminSupabase
    .from('profiles')
    .select('id, full_name, avatar_url, profession, category, is_premium, premium_tier, is_verified')
    .in('id', userIds)

  const byId = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

  const enriched = matches
    .filter(m => {
      if (!search) return true
      const u1 = byId[m.user1_id]?.full_name?.toLowerCase() ?? ''
      const u2 = byId[m.user2_id]?.full_name?.toLowerCase() ?? ''
      const s  = search.toLowerCase()
      return u1.includes(s) || u2.includes(s)
    })
    .map(m => ({
      ...m,
      user1: byId[m.user1_id] ?? null,
      user2: byId[m.user2_id] ?? null,
    }))

  return Response.json({ matches: enriched, total: count ?? 0, page })
}

export async function POST(request: Request) {
  const admin = await getAdminUser()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 403 })

  const body = await request.json()
  const { user1_id, user2_id, action } = body as {
    user1_id?: string
    user2_id?: string
    action?: string
    user_id?: string
    value?: boolean
    category?: string
  }

  // Toggle double_date_active for a user
  if (action === 'toggle_double_date') {
    const { user_id, value } = body as { user_id: string; value: boolean }
    if (!user_id) return Response.json({ error: 'user_id required' }, { status: 400 })
    const { error } = await adminSupabase
      .from('profiles')
      .update({ double_date_active: value })
      .eq('id', user_id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
  }

  // Promote user to company category
  if (action === 'set_company') {
    const { user_id, category } = body as { user_id: string; category: string }
    if (!user_id) return Response.json({ error: 'user_id required' }, { status: 400 })
    const { error } = await adminSupabase
      .from('profiles')
      .update({ category: category ?? 'company' })
      .eq('id', user_id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
  }

  // Create a manual match between two users
  if (!user1_id || !user2_id) {
    return Response.json({ error: 'user1_id and user2_id are required' }, { status: 400 })
  }
  if (user1_id === user2_id) {
    return Response.json({ error: 'Cannot match a user with themselves' }, { status: 400 })
  }

  // Verify both users exist
  const { data: users, error: usersError } = await adminSupabase
    .from('profiles')
    .select('id, full_name')
    .in('id', [user1_id, user2_id])

  if (usersError || !users || users.length < 2) {
    return Response.json({ error: 'One or both users not found' }, { status: 404 })
  }

  // Schema constraint: user1_id < user2_id (UUID comparison)
  const [uid1, uid2] = user1_id < user2_id
    ? [user1_id, user2_id]
    : [user2_id, user1_id]

  // Check if already matched
  const { data: existing } = await adminSupabase
    .from('matches')
    .select('id')
    .eq('user1_id', uid1)
    .eq('user2_id', uid2)
    .maybeSingle()

  if (existing) {
    return Response.json({ error: 'These users are already matched' }, { status: 409 })
  }

  const { data: match, error: matchError } = await adminSupabase
    .from('matches')
    .insert({ user1_id: uid1, user2_id: uid2 })
    .select()
    .single()

  if (matchError || !match) {
    return Response.json({ error: matchError?.message ?? 'Failed to create match' }, { status: 500 })
  }

  // Create conversation for the match
  const { error: convError } = await adminSupabase
    .from('conversations')
    .insert({ match_id: match.id })

  if (convError) {
    // Match created but conv failed — rollback match
    await adminSupabase.from('matches').delete().eq('id', match.id)
    return Response.json({ error: 'Failed to create conversation' }, { status: 500 })
  }

  // Notify both users
  await adminSupabase.from('notifications').insert([
    { user_id: uid1, type: 'match', data: { match_id: match.id, matched_with: uid2, admin_created: true } },
    { user_id: uid2, type: 'match', data: { match_id: match.id, matched_with: uid1, admin_created: true } },
  ])

  return Response.json({ match }, { status: 201 })
}
