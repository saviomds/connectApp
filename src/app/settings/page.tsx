import { getCachedUser, createClient } from '@/lib/supabase/server'
import SettingsPage from '@/layout/SettingsPage'

export default async function Page() {
  const user = await getCachedUser()
  if (!user) return <SettingsPage isAdmin={false} />

  const adminId = process.env.ADMIN_USER_ID ?? ''
  const isEnvAdmin =
    !!adminId &&
    adminId !== 'your-supabase-user-uuid-here' &&
    user.id === adminId

  let isDbAdmin = false
  if (!isEnvAdmin) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    isDbAdmin = data?.is_admin === true
  }

  return <SettingsPage isAdmin={isEnvAdmin || isDbAdmin} />
}
