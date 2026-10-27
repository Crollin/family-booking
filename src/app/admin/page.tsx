import { PendingReservations } from '@/components/admin/PendingReservations'
import { Stats } from '@/components/admin/Stats'
import { MembersList } from '@/components/admin/MembersList'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Dashboard Admin</h1>
        <p className="text-muted-foreground">
          Gérez les réservations et les membres de la plateforme
        </p>
      </div>

      <Stats />

      <div className="grid lg:grid-cols-2 gap-6">
        <PendingReservations />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Toutes les réservations</CardTitle>
            <Link href="/admin/reservations">
              <Button variant="outline" size="sm">
                Voir tout
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Consultez toutes les réservations passées et futures
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Infos pratiques</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Gérez les heures d&apos;ouverture et les informations du logement
            </p>
          </div>
          <Link href="/admin/infos-pratiques">
            <Button variant="outline" size="sm">
              Gérer
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Guide local</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Gérez les points d&apos;intérêt (restaurants, activités, services, commerces)
            </p>
          </div>
          <Link href="/admin/guide-local">
            <Button variant="outline" size="sm">
              Gérer
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Système / Email</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Vérifier la configuration SMTP / Resend et envoyer un email de test
            </p>
          </div>
          <Link href="/admin/systeme">
            <Button variant="outline" size="sm">
              Ouvrir
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
      </Card>

      <MembersList />
    </div>
  )
}

