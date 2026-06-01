import { getAdminUser } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const admin = await getAdminUser()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  // Use admin's own session — is_admin() RLS grants full read on profiles
  const supabase = await createClient()

  const { searchParams } = new URL(request.url)
  const search   = searchParams.get('search') ?? ''
  const filter   = searchParams.get('filter') ?? 'all'
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = 20

  let query = supabase
    .from('profiles')
    .select(
      'id,full_name,avatar_url,profession,company,city,country,category,is_premium,premium_tier,is_verified,is_online,is_suspended,is_admin,last_seen_at,created_at,profile_completion',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (search)               query = query.or(`full_name.ilike.%${search}%,profession.ilike.%${search}%,company.ilike.%${search}%`)
  if (filter === 'admin')     query = query.eq('is_admin', true)
  if (filter === 'premium')   query = query.eq('is_premium', true)
  if (filter === 'suspended') query = query.eq('is_suspended', true)
  if (filter === 'verified')  query = query.eq('is_verified', true)

  const { data, count, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ users: data ?? [], total: count ?? 0, page, pageSize })
}
