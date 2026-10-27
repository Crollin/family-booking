import { Navbar } from '@/components/layout/Navbar'
import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-helpers'
import { UserRole } from '@/types'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

  // Double protection côté serveur pour empêcher l'accès non admin même si le middleware est contourné
  if (!session || session.role !== UserRole.ADMIN) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 md:py-8">
        {children}
      </main>
    </div>
  )
}

