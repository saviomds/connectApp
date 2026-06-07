import { getAdminUser } from '@/lib/admin'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin-setup')

  return (
    <div className="min-h-screen pt-nav flex">
      <AdminNav email={admin.email ?? ''} />
      {/* pt-nav covers the app navbar; on mobile add extra space for the admin hamburger bar (≈48px) */}
      <main className="flex-1 md:ml-56 px-4 md:px-8 pt-[calc(var(--nav-height,64px)+48px)] md:pt-8 pb-28 md:pb-12">
        {children}
      </main>
    </div>
  )
}
