import { createClient } from '@/lib/supabase/server'

export async function PUT(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { password } = await request.json()

  if (!password || password.length < 6) {
    return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true })
}
