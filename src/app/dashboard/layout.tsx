import { Navbar } from '@/components/layout/Navbar'
import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Vérifier l'authentification côté serveur
  const session = await getServerSession()

  // Rediriger vers la page de connexion si non authentifié
  if (!session) {
    redirect('/login')
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

