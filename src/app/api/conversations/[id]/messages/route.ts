import { createClient } from '@/lib/supabase/server'

interface ConvWithMatch {
  id: string
  match: { user1_id: string; user2_id: string }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const PAGE_SIZE = 40
  const before = searchParams.get('before') // cursor: load messages older than this ISO timestamp

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Look up by conversation ID first; fall back to match_id for legacy links
  let convResult = await supabase
    .from('conversations')
    .select('id, match:matches!conversations_match_id_fkey(user1_id, user2_id)')
    .eq('id', id)
    .single()

  if (convResult.error || !convResult.data) {
    convResult = await supabase
      .from('conversations')
      .select('id, match:matches!conversations_match_id_fkey(user1_id, user2_id)')
      .eq('match_id', id)
      .single()
  }

  if (convResult.error || !convResult.data) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const conv = convResult.data
  const convId = conv.id

  const c = conv as unknown as ConvWithMatch
  if (!c.match || (c.match.user1_id !== user.id && c.match.user2_id !== user.id)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  let q = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  if (before) q = q.lt('created_at', before)

  const { data, error } = await q
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const messages = (data ?? []).reverse() // oldest-first for the UI
  const hasMore  = (data ?? []).length === PAGE_SIZE

  // Mark unread messages from the other person as seen (fire-and-forget)
  supabase
    .from('messages')
    .update({ is_seen: true })
    .eq('conversation_id', convId)
    .neq('sender_id', user.id)
    .eq('is_seen', false)
    .then(() => {})

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

  const body = await request.json() as {
    content?: string
    type?: 'text' | 'image' | 'album' | 'view_once'
    media_urls?: string[]
    is_view_once?: boolean
    reply_to_id?: string
  }
  const msgType = body.type ?? 'text'
  const content = body.content?.trim() ?? ''
  const mediaUrls = body.media_urls ?? []

  if (msgType === 'text' && !content) {
    return Response.json({ error: 'Content is required' }, { status: 400 })
  }
  if (content.length > 4000) return Response.json({ error: 'Message too long' }, { status: 400 })
  if ((msgType === 'image' || msgType === 'album' || msgType === 'view_once') && mediaUrls.length === 0) {
    return Response.json({ error: 'media_urls required for media messages' }, { status: 400 })
  }

  let postConvResult = await supabase
    .from('conversations')
    .select('id, match:matches!conversations_match_id_fkey(user1_id, user2_id)')
    .eq('id', id)
    .single()

  if (postConvResult.error || !postConvResult.data) {
    postConvResult = await supabase
      .from('conversations')
      .select('id, match:matches!conversations_match_id_fkey(user1_id, user2_id)')
      .eq('match_id', id)
      .single()
  }

  if (postConvResult.error || !postConvResult.data) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const postConv = postConvResult.data
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
