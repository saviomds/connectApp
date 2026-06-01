import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const adminId = process.env.ADMIN_USER_ID ?? ''
  const isConfigured = adminId.length > 0 && adminId !== 'your-supabase-user-uuid-here'

  if (!user) {
    return Response.json({ loggedIn: false, isConfigured, isAdmin: false })
  }

  return Response.json({
    loggedIn: true,
    userId: user.id,
    email: user.email,
    isConfigured,
    isAdmin: isConfigured && user.id === adminId,
  })
}
