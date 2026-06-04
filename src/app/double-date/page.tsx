import { redirect } from 'next/navigation'
import { getCachedUser } from '@/lib/supabase/server'
import DoubleDatePage from '@/layout/DoubleDatePage'

export const metadata = { title: 'Double Date — Vibro' }

export default async function Page() {
  const user = await getCachedUser()
  if (!user) redirect('/login?next=/double-date')
  return <DoubleDatePage />
}
