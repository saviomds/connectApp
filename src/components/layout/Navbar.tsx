import { getCachedUser, createClient } from '@/lib/supabase/server'
import NavbarClient from './NavbarClient'

export async function Navbar() {
  const user = await getCachedUser()

  if (!user) {
    return <NavbarClient userName={null} avatarUrl={null} unreadCount={0} />
  }

  const supabase = await createClient()

  // Run profile fetch and unread count in parallel — saves ~200ms vs sequential
  const [{ data: profile }, { count }] = await Promise.all([
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
  ])

  return (
    <NavbarClient
      userName={profile?.full_name ?? user.email?.split('@')[0] ?? null}
      avatarUrl={profile?.avatar_url ?? null}
      unreadCount={count ?? 0}
    />
  )
}
