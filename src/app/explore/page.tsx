import { redirect } from 'next/navigation'
import { getCachedUser } from '@/lib/supabase/server'
import ExplorePage from '@/layout/ExplorePage'

export const metadata = { title: 'Explore — Vibro' }

export default async function Page() {
  const user = await getCachedUser()
  if (!user) redirect('/login?next=/explore')
  return <ExplorePage />
}
