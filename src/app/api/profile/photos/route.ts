import { createClient } from '@/lib/supabase/server'

const MAX_SIZE    = 8 * 1024 * 1024 // 8 MB
const MAX_PHOTOS  = 5
const ALLOWED     = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > MAX_SIZE) return Response.json({ error: 'File too large (max 8 MB)' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) return Response.json({ error: 'Invalid type — JPG/PNG/WebP only' }, { status: 400 })

  // Check current count
  const { data: profile } = await supabase
    .from('profiles').select('photos').eq('id', user.id).single()
  if ((profile?.photos?.length ?? 0) >= MAX_PHOTOS) {
    return Response.json({ error: `Maximum ${MAX_PHOTOS} photos allowed` }, { status: 400 })
  }

  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `${user.id}/${Date.now()}.${ext}`
  const { error: uploadErr } = await supabase.storage
    .from('profile-photos')
    .upload(path, await file.arrayBuffer(), { contentType: file.type })
  if (uploadErr) return Response.json({ error: uploadErr.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('profile-photos').getPublicUrl(path)

  const newPhotos = [...(profile?.photos ?? []), publicUrl]
  await supabase.from('profiles').update({ photos: newPhotos }).eq('id', user.id)

  return Response.json({ url: publicUrl, photos: newPhotos })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await request.json() as { url: string }
  if (!url) return Response.json({ error: 'No url provided' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles').select('photos').eq('id', user.id).single()

  const newPhotos = (profile?.photos ?? []).filter((p: string) => p !== url)
  await supabase.from('profiles').update({ photos: newPhotos }).eq('id', user.id)

  // Best-effort delete from storage
  const pathMatch = url.match(/profile-photos\/(.+)$/)
  if (pathMatch) {
    await supabase.storage.from('profile-photos').remove([pathMatch[1]])
  }

  return Response.json({ photos: newPhotos })
}
