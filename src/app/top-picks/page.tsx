import { redirect } from 'next/navigation'
import { getCachedUser } from '@/lib/supabase/server'
import TopPicksPage from '@/layout/TopPicksPage'

export const metadata = { title: 'Top Picks — Vibro' }

export default async function Page() {
  const user = await getCachedUser()
  if (!user) redirect('/login?next=/top-picks')
  return <TopPicksPage />
}
