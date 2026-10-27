'use client'

import { useState, useEffect } from 'react'
import { Reservation } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export function PendingReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [adminComment, setAdminComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchPendingReservations()
  }, [])

  const fetchPendingReservations = async () => {
    try {
      const { apiGet } = await import('@/lib/api-client')
      const response = await apiGet('/api/reservations')
      if (response.ok) {
        const data = await response.json()
        setReservations(data.filter((r: Reservation) => r.status === 'PENDING'))
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setAction('approve')
    setAdminComment('')
  }

  const handleReject = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setAction('reject')
    setAdminComment('')
  }

  const handleSubmit = async () => {
    if (!selectedReservation || !action) return

    setIsSubmitting(true)

    try {
      const { apiPost } = await import('@/lib/api-client')
      const response = await apiPost(`/api/reservations/${selectedReservation.id}/approve`, {
        action,
        adminComment: adminComment || null,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Une erreur est survenue')
      }

      toast({
        title: action === 'approve' ? 'Réservation approuvée' : 'Réservation refusée',
        description: 'La notification a été envoyée au membre.',
      })

      setSelectedReservation(null)
      setAction(null)
      setAdminComment('')
      fetchPendingReservations()
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <div>Chargement...</div>
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Demandes en attente</CardTitle>
        </CardHeader>
        <CardContent>
          {reservations.length === 0 ? (
            <p className="text-muted-foreground">Aucune demande en attente</p>
          ) : (
            <div className="space-y-4">
              {reservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-semibold">
                      {reservation.user?.name || reservation.user?.email || 'Utilisateur'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(reservation.startDate), 'dd MMMM', { locale: fr })} -{' '}
                      {format(new Date(reservation.endDate), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {reservation.guests} personne{reservation.guests > 1 ? 's' : ''}
                    </p>
                    {reservation.comment && (
                      <p className="text-sm mt-2 italic">{reservation.comment}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(reservation)}
                    >
                      Approuver
                    </Button>
                    <Button
                      onClick={() => handleReject(reservation)}
                      variant="destructive"
                    >
                      Refuser
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedReservation} onOpenChange={() => {
        setSelectedReservation(null)
        setAction(null)
        setAdminComment('')
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Approuver la réservation' : 'Refuser la réservation'}
            </DialogTitle>
            <DialogDescription>
              {action === 'reject' && 'Vous pouvez ajouter un commentaire expliquant la raison du refus.'}
            </DialogDescription>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Membre:</p>
                <p className="text-sm text-muted-foreground">
                  {selectedReservation.user?.name || selectedReservation.user?.email}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Dates:</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedReservation.startDate), 'dd MMMM yyyy', { locale: fr })} -{' '}
                  {format(new Date(selectedReservation.endDate), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
              {action === 'reject' && (
                <div className="space-y-2">
                  <Label htmlFor="comment">Commentaire (optionnel)</Label>
                  <Textarea
                    id="comment"
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    placeholder="Raison du refus..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedReservation(null)
                setAction(null)
                setAdminComment('')
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Traitement...' : action === 'approve' ? 'Approuver' : 'Refuser'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}


