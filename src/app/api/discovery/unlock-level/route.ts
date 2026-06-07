import { createClient } from '@/lib/supabase/server'
import { getCachedUser } from '@/lib/supabase/server'
import { computeUserLevel, canUnlockLevel, type UserLevel } from '@/lib/discovery-levels'

/**
 * POST /api/discovery/unlock-level
 * Body: { target_level: 1 | 2 | 3 }
 *
 * Allows a premium Level 2 or Level 3 user to pay-gate visibility
 * into another level's profiles.
 *
 * Visibility rules:
 *   Level 2 (professional) + premium → can unlock Level 1 (youth) and/or Level 3 (verified)
 *   Level 3 (verified)     + premium → can unlock Level 1 (youth) and/or Level 2 (professional)
 *   Level 1 (youth)                  → cannot unlock any additional levels
 */
export async function POST(request: Request) {
  const user = await getCachedUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const targetLevel = (body as Record<string, unknown>)?.target_level
  if (targetLevel !== 1 && targetLevel !== 2 && targetLevel !== 3) {
    return Response.json({ error: 'target_level must be 1, 2, or 3' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_verified, is_professional, category, is_premium, unlocked_levels')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return Response.json({ error: 'Profile not found' }, { status: 404 })
  }

  const myLevel = computeUserLevel(profile)

  if (!canUnlockLevel(myLevel, profile.is_premium, targetLevel as UserLevel)) {
    if (!profile.is_premium) {
      return Response.json(
        { error: 'A premium subscription is required to unlock visibility to other levels' },
        { status: 403 },
      )
    }
    if (myLevel === 1) {
      return Response.json(
        { error: 'Youth accounts cannot unlock visibility to other levels' },
        { status: 403 },
      )
    }
    return Response.json(
      { error: 'Your level cannot unlock visibility to the requested level' },
      { status: 403 },
    )
  }

  const current: number[] = profile.unlocked_levels ?? []
  if (current.includes(targetLevel)) {
    return Response.json({ message: 'Level already unlocked', unlocked_levels: current })
  }

  const updated = [...current, targetLevel as number]
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ unlocked_levels: updated })
    .eq('id', user.id)

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  return Response.json({ message: 'Level unlocked', unlocked_levels: updated })
}

/**
 * DELETE /api/discovery/unlock-level
 * Body: { target_level: 1 | 2 | 3 }
 *
 * Removes a previously unlocked level from the user's visibility.
 */
export async function DELETE(request: Request) {
  const user = await getCachedUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const targetLevel = (body as Record<string, unknown>)?.target_level
  if (targetLevel !== 1 && targetLevel !== 2 && targetLevel !== 3) {
    return Response.json({ error: 'target_level must be 1, 2, or 3' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('unlocked_levels')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return Response.json({ error: 'Profile not found' }, { status: 404 })
  }

  const updated = (profile.unlocked_levels ?? []).filter((l: number) => l !== targetLevel)
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ unlocked_levels: updated })
    .eq('id', user.id)

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  return Response.json({ message: 'Level visibility removed', unlocked_levels: updated })
}
