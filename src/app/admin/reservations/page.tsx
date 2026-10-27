'use client'

import { useState, useEffect } from 'react'
import { Reservation, ReservationStatus } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ReservationForm } from '@/components/admin/ReservationForm'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Trash2, Edit, X, Plus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AllReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [reservationToDelete, setReservationToDelete] = useState<Reservation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [hardDelete, setHardDelete] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchReservations()
  }, [])

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredReservations(reservations)
    } else {
      setFilteredReservations(
        reservations.filter((r) => r.status === statusFilter)
      )
    }
  }, [statusFilter, reservations])

  const fetchReservations = async () => {
    try {
      const { apiGet } = await import('@/lib/api-client')
      const response = await apiGet('/api/reservations')
      if (response.ok) {
        const data = await response.json()
        setReservations(data)
        setFilteredReservations(data)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setIsLoading(false)
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

  const handleCreate = () => {
    setSelectedReservation(null)
    setFormOpen(true)
  }

  const handleEdit = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setFormOpen(true)
  }

  const handleDelete = (reservation: Reservation, hard: boolean = false) => {
    setReservationToDelete(reservation)
    setHardDelete(hard)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!reservationToDelete) return

    setIsDeleting(true)
    try {
      const { apiDelete } = await import('@/lib/api-client')
      const response = await apiDelete(`/api/reservations/${reservationToDelete.id}?hardDelete=${hardDelete}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Une erreur est survenue')
      }

      toast({
        title: hardDelete ? 'Réservation supprimée' : 'Réservation annulée',
        description: hardDelete
          ? 'La réservation a été supprimée définitivement.'
          : 'La réservation a été annulée.',
      })

      setDeleteDialogOpen(false)
      setReservationToDelete(null)
      setHardDelete(false)
      fetchReservations()
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" size="icon" title="Retour au menu admin">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold mb-2">Toutes les réservations</h1>
              <p className="text-muted-foreground">
                Consultez et gérez toutes les réservations de la plateforme
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle réservation
            </Button>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value={ReservationStatus.PENDING}>En attente</SelectItem>
                <SelectItem value={ReservationStatus.APPROVED}>Confirmées</SelectItem>
                <SelectItem value={ReservationStatus.REJECTED}>Refusées</SelectItem>
                <SelectItem value={ReservationStatus.CANCELLED}>Annulées</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {filteredReservations.length} réservation{filteredReservations.length > 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReservations.length === 0 ? (
            <p className="text-muted-foreground">Aucune réservation</p>
          ) : (
            <div className="space-y-4">
              {filteredReservations
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((reservation) => (
                  <div
                    key={reservation.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-semibold">
                        {reservation.user?.name || reservation.user?.email || 'Utilisateur'}
                      </p>
                      <p className="text-sm text-muted-foreground">
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
                    <div className="flex items-center gap-2">
                      {getStatusBadge(reservation.status)}
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(reservation)}
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {reservation.status === ReservationStatus.REJECTED ? (
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDelete(reservation, true)}
                            title="Supprimer définitivement"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : reservation.status !== ReservationStatus.CANCELLED ? (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(reservation, false)}
                            title="Annuler"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      <ReservationForm
        reservation={selectedReservation}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={() => {
          fetchReservations()
        }}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {hardDelete ? 'Supprimer définitivement' : 'Annuler la réservation'}
            </DialogTitle>
            <DialogDescription>
              {hardDelete
                ? 'Êtes-vous sûr de vouloir supprimer définitivement cette réservation ? Cette action est irréversible.'
                : 'Êtes-vous sûr de vouloir annuler cette réservation ? Le membre sera notifié.'}
            </DialogDescription>
          </DialogHeader>
          {reservationToDelete && (
            <div className="space-y-2">
              <p className="text-sm">
                <strong>Membre:</strong> {reservationToDelete.user?.name || reservationToDelete.user?.email}
              </p>
              <p className="text-sm">
                <strong>Dates:</strong>{' '}
                {format(new Date(reservationToDelete.startDate), 'dd MMMM yyyy', { locale: fr })} -{' '}
                {format(new Date(reservationToDelete.endDate), 'dd MMMM yyyy', { locale: fr })}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setReservationToDelete(null)
                setHardDelete(false)
              }}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button
              variant={hardDelete ? 'destructive' : 'default'}
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Traitement...' : hardDelete ? 'Supprimer définitivement' : 'Annuler la réservation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

