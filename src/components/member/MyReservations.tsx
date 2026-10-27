'use client'

import { useState, useEffect } from 'react'
import { Reservation, ReservationStatus } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useToast } from '@/components/ui/use-toast'
import { Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function MyReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [reservationToCancel, setReservationToCancel] = useState<Reservation | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchReservations()
  }, [])

  const fetchReservations = async () => {
    try {
      const { apiGet } = await import('@/lib/api-client')
      const response = await apiGet('/api/reservations')
      if (response.ok) {
        const data = await response.json()
        setReservations(data)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!reservationToCancel) return

    setIsCancelling(true)

    try {
      const { apiDelete } = await import('@/lib/api-client')
      const response = await apiDelete(`/api/reservations/${reservationToCancel.id}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Une erreur est survenue')
      }

      toast({
        title: 'Réservation annulée',
        description: 'Votre réservation a été annulée avec succès.',
      })

      setReservationToCancel(null)
      fetchReservations()
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      })
    } finally {
      setIsCancelling(false)
    }
  }

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

  const canCancel = (reservation: Reservation) => {
    const endDate = new Date(reservation.endDate)
    const today = new Date()
    return (
      (reservation.status === ReservationStatus.PENDING ||
        reservation.status === ReservationStatus.APPROVED) &&
      endDate >= today
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  const upcomingReservations = reservations.filter((r) => {
    const end = new Date(r.endDate)
    return end >= new Date()
  })

  const pastReservations = reservations.filter((r) => {
    const end = new Date(r.endDate)
    return end < new Date()
  })

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Mes réservations à venir</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingReservations.length === 0 ? (
              <p className="text-muted-foreground">Aucune réservation à venir</p>
            ) : (
              <div className="space-y-4">
                {upcomingReservations
                  .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                  .map((reservation) => (
                    <div
                      key={reservation.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(reservation.status)}
                        </div>
                        <p className="font-semibold">
                          {format(new Date(reservation.startDate), 'dd MMMM yyyy', { locale: fr })} -{' '}
                          {format(new Date(reservation.endDate), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {reservation.guests} personne{reservation.guests > 1 ? 's' : ''}
                        </p>
                        {reservation.comment && (
                          <p className="text-sm mt-2 italic">{reservation.comment}</p>
                        )}
                        {reservation.adminComment && (
                          <p className="text-sm mt-2 text-muted-foreground">
                            <strong>Commentaire admin:</strong> {reservation.adminComment}
                          </p>
                        )}
                      </div>
                      {canCancel(reservation) && (
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => setReservationToCancel(reservation)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {pastReservations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Réservations passées</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pastReservations
                  .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                  .map((reservation) => (
                    <div
                      key={reservation.id}
                      className="flex items-center justify-between p-4 border rounded-lg opacity-75"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(reservation.status)}
                        </div>
                        <p className="font-semibold">
                          {format(new Date(reservation.startDate), 'dd MMMM yyyy', { locale: fr })} -{' '}
                          {format(new Date(reservation.endDate), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {reservation.guests} personne{reservation.guests > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!reservationToCancel} onOpenChange={() => setReservationToCancel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler la réservation</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir annuler cette réservation ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          {reservationToCancel && (
            <div>
              <p className="text-sm">
                {format(new Date(reservationToCancel.startDate), 'dd MMMM yyyy', { locale: fr })} -{' '}
                {format(new Date(reservationToCancel.endDate), 'dd MMMM yyyy', { locale: fr })}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReservationToCancel(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isCancelling}>
              {isCancelling ? 'Annulation...' : 'Confirmer l\'annulation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}


