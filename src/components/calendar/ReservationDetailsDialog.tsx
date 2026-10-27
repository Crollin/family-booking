'use client'

import { Reservation, ReservationStatus } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ReservationDetailsDialogProps {
  reservation: Reservation | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReservationDetailsDialog({
  reservation,
  open,
  onOpenChange,
}: ReservationDetailsDialogProps) {
  if (!reservation) return null

  const getStatusBadge = (status: ReservationStatus) => {
    const variants = {
      [ReservationStatus.PENDING]: 'bg-warning text-primary-foreground',
      [ReservationStatus.APPROVED]: 'bg-primary text-primary-foreground',
      [ReservationStatus.REJECTED]: 'bg-destructive text-destructive-foreground',
      [ReservationStatus.CANCELLED]: 'bg-muted text-muted-foreground',
    }

    const labels = {
      [ReservationStatus.PENDING]: 'En attente',
      [ReservationStatus.APPROVED]: 'Confirmé',
      [ReservationStatus.REJECTED]: 'Refusé',
      [ReservationStatus.CANCELLED]: 'Annulé',
    }

    return (
      <Badge className={variants[status]}>
        {labels[status]}
      </Badge>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Détails de la réservation
            {getStatusBadge(reservation.status)}
          </DialogTitle>
          <DialogDescription>
            Informations complètes sur la réservation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">
                Utilisateur
              </p>
              <p className="text-base">
                {reservation.user?.name || reservation.user?.email || 'Utilisateur'}
              </p>
              {reservation.user?.email && reservation.user?.name && (
                <p className="text-sm text-muted-foreground mt-1">
                  {reservation.user.email}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">
                Nombre de personnes
              </p>
              <p className="text-base">
                {reservation.guests} personne{reservation.guests > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">
                Date d&apos;arrivée
              </p>
              <p className="text-base">
                {format(new Date(reservation.startDate), 'dd MMMM yyyy', { locale: fr })}
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">
                Date de départ
              </p>
              <p className="text-base">
                {format(new Date(reservation.endDate), 'dd MMMM yyyy', { locale: fr })}
              </p>
            </div>
          </div>

          {reservation.comment && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">
                Commentaire
              </p>
              <p className="text-base italic bg-muted p-3 rounded-md">
                {reservation.comment}
              </p>
            </div>
          )}

          {reservation.adminComment && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">
                Commentaire administrateur
              </p>
              <p className="text-base bg-muted p-3 rounded-md">
                {reservation.adminComment}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">
                Créée le
              </p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(reservation.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">
                Modifiée le
              </p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(reservation.updatedAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

