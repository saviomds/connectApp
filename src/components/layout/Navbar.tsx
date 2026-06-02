import { getCachedUser, createClient } from '@/lib/supabase/server'
import NavbarClient from './NavbarClient'

export async function Navbar() {
  const user = await getCachedUser()

  if (!user) {
    return <NavbarClient userName={null} avatarUrl={null} unreadCount={0} likedYouCount={0} />
  }

  const supabase = await createClient()

  const [{ data: profile }, { count: unread }, { count: liked }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single(),
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('is_seen', false)
      .neq('sender_id', user.id),
    supabase
      .from('swipes')
      .select('id', { count: 'exact', head: true })
      .eq('target_id', user.id)
      .in('direction', ['like', 'super_like']),
  ])

  return (
    <NavbarClient
      userName={profile?.full_name ?? user.email?.split('@')[0] ?? null}
      avatarUrl={profile?.avatar_url ?? null}
      unreadCount={unread ?? 0}
      likedYouCount={liked ?? 0}
    />
  )
}
