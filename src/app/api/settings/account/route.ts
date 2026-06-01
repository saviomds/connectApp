import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function DELETE(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // 1. Delete profile row — cascades to swipes, matches, conversations, messages, notifications
  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', user.id)

  if (profileError) return Response.json({ error: profileError.message }, { status: 500 })

  // 2. Delete the auth.users row using the service-role admin client
  const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(user.id)

  if (authDeleteError) {
    // Profile is already deleted — log but still redirect; user can't log in again anyway
    console.error('auth.users delete failed:', authDeleteError.message)
  }

  // 3. Sign out the current session
  await supabase.auth.signOut()

  const origin = new URL(request.url).origin
  return NextResponse.redirect(`${origin}/login`)
}
