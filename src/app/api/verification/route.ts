import { createClient } from '@/lib/supabase/server'
import { GATED_CATEGORIES } from '@/types/database'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED  = ['image/jpeg', 'image/png', 'image/webp']

async function uploadVerifPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  file: File,
  label: string,
): Promise<string> {
  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/${label}-${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('verification-docs')
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true })
  if (error) throw new Error(`Upload failed for ${label}: ${error.message}`)

  const { data: { publicUrl } } = supabase.storage
    .from('verification-docs')
    .getPublicUrl(path)
  return publicUrl
}

// GET — return current user's latest verification request
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('verification_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return Response.json(data ?? null)
}

// POST — submit a new verification request with 3 photos
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Block if already pending or approved
  const { data: profile } = await supabase
    .from('profiles')
    .select('verification_status, is_professional, category')
    .eq('id', user.id)
    .single()

  if (profile?.verification_status === 'pending') {
    return Response.json({ error: 'You already have a pending verification request.' }, { status: 409 })
  }
  if (profile?.verification_status === 'approved') {
    return Response.json({ error: 'You are already verified.' }, { status: 409 })
  }

  const formData = await request.formData()
  const category   = formData.get('category') as string
  const fileSelfie = formData.get('photo_selfie') as File | null
  const fileId     = formData.get('photo_id') as File | null
  const filePort   = formData.get('photo_portrait') as File | null

  if (!category || !fileSelfie || !fileId || !filePort) {
    return Response.json({ error: 'All three photos and category are required.' }, { status: 400 })
  }

  const allFiles = [fileSelfie, fileId, filePort]
  for (const f of allFiles) {
    if (f.size > MAX_SIZE) return Response.json({ error: 'Each photo must be under 10 MB.' }, { status: 400 })
    if (!ALLOWED.includes(f.type)) return Response.json({ error: 'Photos must be JPG/PNG/WebP.' }, { status: 400 })
  }

  try {
    const [selfieUrl, idUrl, portraitUrl] = await Promise.all([
      uploadVerifPhoto(supabase, user.id, fileSelfie, 'selfie'),
      uploadVerifPhoto(supabase, user.id, fileId,     'id'),
      uploadVerifPhoto(supabase, user.id, filePort,   'portrait'),
    ])

    await supabase.from('verification_requests').insert({
      user_id:            user.id,
      category,
      photo_selfie_url:   selfieUrl,
      photo_id_url:       idUrl,
      photo_portrait_url: portraitUrl,
      status:             'pending',
    })

    await supabase
      .from('profiles')
      .update({ verification_status: 'pending' })
      .eq('id', user.id)

    return Response.json({ status: 'pending' }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upload failed'
    return Response.json({ error: msg }, { status: 500 })
  }
}
