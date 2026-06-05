import { createClient } from '@/lib/supabase/server'

const FREE_DAILY_MSG_LIMIT = 20

interface ConvWithMatch {
  id: string
  match: { user1_id: string; user2_id: string }
}

async function resolveConversation(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  // Try by conversation ID first, then by match_id for legacy links
  let result = await supabase
    .from('conversations')
    .select('id, match:matches!conversations_match_id_fkey(user1_id, user2_id)')
    .eq('id', id)
    .single()

  if (result.error || !result.data) {
    result = await supabase
      .from('conversations')
      .select('id, match:matches!conversations_match_id_fkey(user1_id, user2_id)')
      .eq('match_id', id)
      .single()
  }

  return result
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const PAGE_SIZE = 40
  const before = searchParams.get('before')

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const convResult = await resolveConversation(supabase, id)
  if (convResult.error || !convResult.data) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const conv = convResult.data
  const convId = conv.id
  const c = conv as unknown as ConvWithMatch
  if (!c.match || (c.match.user1_id !== user.id && c.match.user2_id !== user.id)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch user's tier to gate read receipts
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_premium')
    .eq('id', user.id)
    .single()
  const isPremium = profile?.is_premium ?? false

  let q = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  if (before) q = q.lt('created_at', before)

  const { data, error } = await q
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const rawMessages = (data ?? []).reverse()

  // Mark unread messages from the other person as seen (fire-and-forget)
  supabase
    .from('messages')
    .update({ is_seen: true })
    .eq('conversation_id', convId)
    .neq('sender_id', user.id)
    .eq('is_seen', false)
    .then(() => {})

  // Read receipts are Gold/Platinum only.
  // Free users see is_seen=false on their own messages so no double-checkmark appears.
  const messages = rawMessages.map(msg => ({
    ...msg,
    is_seen: msg.sender_id === user.id
      ? (isPremium ? msg.is_seen : false)
      : msg.is_seen,
  }))

  const hasMore = (data ?? []).length === PAGE_SIZE
  return Response.json({ messages, hasMore })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { content?: string; type?: 'text' | 'image' | 'album' | 'view_once' | 'voice'; media_urls?: string[]; is_view_once?: boolean; reply_to_id?: string }
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const msgType = body.type ?? 'text'
  const content = body.content?.trim() ?? ''
  const mediaUrls = body.media_urls ?? []

  if (msgType === 'text' && !content) {
    return Response.json({ error: 'Content is required' }, { status: 400 })
  }
  if (content.length > 4000) return Response.json({ error: 'Message too long' }, { status: 400 })
  if ((msgType === 'image' || msgType === 'album' || msgType === 'view_once' || msgType === 'voice') && mediaUrls.length === 0) {
    return Response.json({ error: 'media_urls required for media messages' }, { status: 400 })
  }

  // Fetch user's tier for free message limit
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('is_premium')
    .eq('id', user.id)
    .single()
  const isPremium = senderProfile?.is_premium ?? false

  // Free users: enforce daily message limit across all conversations
  if (!isPremium) {
    const todayISO = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', user.id)
      .gte('created_at', todayISO)

    if ((count ?? 0) >= FREE_DAILY_MSG_LIMIT) {
      return Response.json(
        { error: 'Daily message limit reached. Upgrade to Gold for unlimited messaging.', limitReached: true },
        { status: 429 }
      )
    }
  }

  const convResult = await resolveConversation(supabase, id)
  if (convResult.error || !convResult.data) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const postConv = convResult.data
  const postConvId = postConv.id
  const pc = postConv as unknown as ConvWithMatch
  if (!pc.match || (pc.match.user1_id !== user.id && pc.match.user2_id !== user.id)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: postConvId,
      sender_id: user.id,
      content,
      type: msgType,
      media_urls: mediaUrls,
      is_view_once: body.is_view_once ?? msgType === 'view_once',
      ...(body.reply_to_id ? { reply_to_id: body.reply_to_id } : {}),
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(data, { status: 201 })
}
