import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function DELETE(request: Request) {
  const supabase = await createClient()

  // 1. Authenticate the user to ensure they can only delete their own identity
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { confirmation } = await request.json()

    // 2. Verify the confirmation string
    if (confirmation !== 'DELETE') {
      return Response.json({ error: 'Please type DELETE to confirm' }, { status: 400 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl || serviceRoleKey.includes('your_supabase_service_role_key')) {
      return Response.json({ error: 'Service Role Key is missing or invalid in .env' }, { status: 500 })
    }

    // 3. Create an admin client (bypasses RLS)
    const adminClient = createServiceClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Safety Check: Ensure the user.id is valid and specifically targeted.
    if (!user.id) {
      return Response.json({ error: 'Invalid user session' }, { status: 400 })
    }

    // 4. Forceful cleanup: Delete the profile row explicitly first.
    // This triggers all database cascades (swipes, matches, messages, etc.)
    const { error: profileError } = await adminClient.from('profiles').delete().eq('id', user.id)
    if (profileError) throw new Error(`Database cleanup failed: ${profileError.message}`)

    // 5. Finally, remove the user from Supabase Auth (auth.users)
    // This is the "permanent" part that stops them from logging in again.
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id, true) // true = soft delete sessions

    if (deleteError) throw deleteError

    // Purge the cache for discovery and matches to ensure 
    // the user disappears from other people's feeds immediately.
    revalidatePath('/', 'layout')

    return Response.json({ success: true, message: 'Account and associated data deleted permanently' })
  } catch (error: any) {
    return Response.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 })
  }
}