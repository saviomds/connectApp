import { getAdminUser } from '@/lib/admin'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin-setup')

  return (
    <div className="min-h-screen pt-nav flex">
      <AdminNav email={admin.email ?? ''} />
      <main className="flex-1 md:ml-56 px-4 md:px-8 pt-nav md:pt-8 pb-28 md:pb-12">
        {children}
      </main>
    </div>
  )
}
