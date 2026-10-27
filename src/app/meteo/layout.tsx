import { Navbar } from '@/components/layout/Navbar'

export const dynamic = 'force-dynamic'

export default function MeteoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 md:py-8">
        {children}
      </main>
    </div>
  )
}

