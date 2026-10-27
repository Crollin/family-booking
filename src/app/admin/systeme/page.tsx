import { EmailSystemTools } from '@/components/admin/EmailSystemTools'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function AdminSystemPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
        <div>
          <h1 className="text-4xl font-bold mb-2">Système</h1>
          <p className="text-muted-foreground">
            Diagnostic et tests des services applicatifs
          </p>
        </div>
      </div>

      <EmailSystemTools />
    </div>
  )
}
