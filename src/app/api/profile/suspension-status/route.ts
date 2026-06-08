import { getCachedUser, createClient } from '@/lib/supabase/server'

export async function GET() {
  const user = await getCachedUser()
  if (!user) return Response.json({ suspended: false })

  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('is_suspended')
    .eq('id', user.id)
    .single()

  return Response.json({ suspended: !!data?.is_suspended })
}
