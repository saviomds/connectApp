import { getAdminUser } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'

// Extract the storage path from a Supabase Storage URL
function storagePath(url: string | null): string | null {
  if (!url) return null
  const m = url.match(/\/verification-docs\/(.+?)(\?|$)/)
  return m ? m[1] : null
}

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = await createClient()

  const { data: requests, error } = await supabase
    .from('verification_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const rows = requests ?? []
  if (rows.length === 0) return Response.json([])

  // Fetch profiles
  const userIds = rows.map((r: { user_id: string }) => r.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, category, profession')
    .in('id', userIds)

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p: { id: string }) => [p.id, p])
  )

  // For each row, try to generate 1-hour signed URLs so the admin browser
  // can load the images regardless of bucket public/private setting.
  // If signing fails (bucket is public anyway, or key missing), keep raw URL.
  type Row = {
    user_id: string
    photo_portrait_url: string
    photo_id_url: string
    photo_selfie_url: string
    [key: string]: unknown
  }

  const enriched = await Promise.all(rows.map(async (r: Row) => {
    const photoKeys = ['photo_portrait_url', 'photo_id_url', 'photo_selfie_url'] as const
    const signedUrls: Record<string, string> = {}

    await Promise.all(photoKeys.map(async (key) => {
      const path = storagePath(r[key] as string)
      if (!path) return
      const { data } = await supabase.storage
        .from('verification-docs')
        .createSignedUrl(path, 3600)
      if (data?.signedUrl) signedUrls[key] = data.signedUrl
    }))

    return {
      ...r,
      ...signedUrls,
      profile: profileMap[r.user_id] ?? null,
    }
  }))

  return Response.json(enriched)
}
