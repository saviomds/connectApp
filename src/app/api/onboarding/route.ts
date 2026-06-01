import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { category, profession, age, bio, city, country } = body

  if (!category || !profession || !age) {
    return Response.json({ error: 'category, profession, and age are required' }, { status: 400 })
  }

  // Use UPSERT so the route works even if the trigger-created row is missing
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      full_name: user.user_metadata?.full_name ?? '',
      category,
      profession,
      age: parseInt(age, 10),
      bio: bio ?? null,
      city: city ?? null,
      country: country ?? null,
      onboarding_completed: true,
    }, { onConflict: 'id' })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(data)
}
