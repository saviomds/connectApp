import { Edit } from 'lucide-react';
import { getCachedUser, createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MessagesSearch from '@/components/MessagesSearch';

interface ProfileRow { id: string; full_name: string; avatar_url: string | null; is_online: boolean; is_verified: boolean }
interface MatchRow { user1_id: string; user2_id: string; user1: ProfileRow; user2: ProfileRow }
interface MsgRow { id: string; content: string; sender_id: string; is_seen: boolean; created_at: string }
interface ConvRow { id: string; match_id: string; updated_at: string; match: MatchRow; messages: MsgRow[] }

export default async function MessagesPage() {
  const user = await getCachedUser();
  if (!user) redirect('/login');

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      match_id,
      updated_at,
      match:matches!conversations_match_id_fkey(
        user1_id, user2_id,
        user1:profiles!matches_user1_id_fkey(id,full_name,avatar_url,is_online,is_verified),
        user2:profiles!matches_user2_id_fkey(id,full_name,avatar_url,is_online,is_verified)
      ),
      messages(id,content,sender_id,is_seen,created_at)
    `)
    .order('updated_at', { ascending: false });

  if (error) console.error('Messages page error:', error.message);

  const rows = data as unknown as ConvRow[]

  const conversations = (rows ?? [])
    .filter((c) => c.match?.user1_id === user.id || c.match?.user2_id === user.id)
    .map((c) => {
      const match = c.match;
      const otherProfile = match.user1_id === user.id ? match.user2 : match.user1;
      const msgs = (c.messages ?? []).sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const lastMsg = msgs[0];
      const unread = msgs.filter((m) => !m.is_seen && m.sender_id !== user.id).length;

      return {
        id: c.id,
        lastMessage: lastMsg?.content ?? 'Say hello 👋',
        lastTime: lastMsg?.created_at ?? c.updated_at,
        unread,
        profile: {
          name: otherProfile?.full_name ?? 'Unknown',
          photo: otherProfile?.avatar_url ?? '',
          isOnline: otherProfile?.is_online ?? false,
          isVerified: otherProfile?.is_verified ?? false,
        },
      };
    });

  return (
    <div className="min-h-screen pt-20 pb-24 md:pb-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-white">Messages</h1>
          <button className="glass w-9 h-9 rounded-xl flex items-center justify-center text-white/50 hover:text-white transition-colors">
            <Edit size={16} />
          </button>
        </div>
        <MessagesSearch conversations={conversations} />
      </div>
    </div>
  );
}
