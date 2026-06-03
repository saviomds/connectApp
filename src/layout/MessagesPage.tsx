import { getCachedUser, createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MessagesClient, { type ConvRow } from '@/components/MessagesClient'

interface ProfileRow { id: string; full_name: string; avatar_url: string | null; is_online: boolean; is_verified: boolean; is_premium: boolean; premium_tier: 'gold' | 'platinum' | null }
interface MatchRow { user1_id: string; user2_id: string; user1: ProfileRow; user2: ProfileRow }
interface MsgRow { id: string; content: string; sender_id: string; is_seen: boolean; created_at: string }
interface RawConvRow { id: string; match_id: string; updated_at: string; created_at: string; match: MatchRow; messages: MsgRow[] }

export default async function MessagesPage() {
  const user = await getCachedUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      match_id,
      updated_at,
      created_at,
      match:matches!conversations_match_id_fkey(
        user1_id, user2_id,
        user1:profiles!matches_user1_id_fkey(id,full_name,avatar_url,is_online,is_verified,is_premium,premium_tier),
        user2:profiles!matches_user2_id_fkey(id,full_name,avatar_url,is_online,is_verified,is_premium,premium_tier)
      ),
      messages(id,content,sender_id,is_seen,created_at)
    `)
    .order('updated_at', { ascending: false })
    .order('created_at', { referencedTable: 'messages', ascending: false })
    .limit(30, { referencedTable: 'messages' })
    .limit(100)

  if (error) console.error('MessagesPage error:', error.message)

  const rows = (data ?? []) as unknown as RawConvRow[]

  const conversations: ConvRow[] = rows
    .filter(c => c.match?.user1_id === user.id || c.match?.user2_id === user.id)
    .map(c => {
      const other = c.match.user1_id === user.id ? c.match.user2 : c.match.user1
      const msgs  = (c.messages ?? []).sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      const last  = msgs[0]
      return {
        id:                     c.id,
        match_id:               c.match_id,
        updated_at:             c.updated_at,
        created_at:             c.created_at,
        other_profile:          other,
        last_message:           last?.content ?? null,
        last_message_at:        last?.created_at ?? null,
        last_message_sender_id: last?.sender_id ?? null,
        unread_count:           msgs.filter(m => !m.is_seen && m.sender_id !== user.id).length,
      }
    })

  return <MessagesClient currentUserId={user.id} initialConversations={conversations} />
}
