import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { category, profession, age, bio, city, country, looking_for } = body as Record<string, string>

  if (!category || !profession || !age) {
    return Response.json({ error: 'category, profession, and age are required' }, { status: 400 })
  }

  const parsedAge = parseInt(age, 10)
  if (isNaN(parsedAge) || parsedAge < 18) {
    return Response.json({ error: 'You must be at least 18 years old.' }, { status: 400 })
  }

  const ALLOWED_LOOKING = new Set(['relationship', 'dating', 'friendship', 'networking', 'casual', 'not_sure'])
  const safeLoookingFor = looking_for && ALLOWED_LOOKING.has(looking_for) ? looking_for : null

  // Use UPSERT so the route works even if the trigger-created row is missing
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      full_name: user.user_metadata?.full_name ?? '',
      category,
      gender: user.user_metadata?.gender ?? null,
      profession,
      age: parsedAge,
      bio: bio ?? null,
      city: city ?? null,
      country: country ?? null,
      looking_for: safeLoookingFor,
      onboarding_completed: true,
    }, { onConflict: 'id' })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(data)
}
