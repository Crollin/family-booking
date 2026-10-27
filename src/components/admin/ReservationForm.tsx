'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'
import { Reservation, ReservationStatus } from '@/types'

interface User {
  id: string
  email: string
  name: string | null
}

interface ReservationFormProps {
  reservation?: Reservation | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ReservationForm({ reservation, open, onOpenChange, onSuccess }: ReservationFormProps) {
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [userId, setUserId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [guests, setGuests] = useState(1)
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState<ReservationStatus>(ReservationStatus.APPROVED)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEditMode = !!reservation

  useEffect(() => {
    if (open) {
      fetchUsers()
      if (reservation) {
        setUserId(reservation.userId)
        setStartDate(format(new Date(reservation.startDate), 'yyyy-MM-dd'))
        setEndDate(format(new Date(reservation.endDate), 'yyyy-MM-dd'))
        setGuests(reservation.guests)
        setComment(reservation.comment || '')
        setStatus(reservation.status)
      } else {
        // Reset form for new reservation
        setUserId('')
        setStartDate('')
        setEndDate('')
        setGuests(1)
        setComment('')
        setStatus(ReservationStatus.APPROVED)
      }
    }
  }, [open, reservation])

  const fetchUsers = async () => {
    setIsLoadingUsers(true)
    try {
      const { apiGet } = await import('@/lib/api-client')
      const response = await apiGet('/api/members')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.filter((u: User) => u.id)) // Filtrer les utilisateurs valides
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error)
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userId || !startDate || !endDate || !guests) {
      toast({
        title: 'Erreur',
        description: 'Tous les champs sont requis',
        variant: 'destructive',
      })
      return
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    // Validation des dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      toast({
        title: 'Erreur',
        description: 'Les dates saisies sont invalides',
        variant: 'destructive',
      })
      return
    }

    if (start >= end) {
      toast({
        title: 'Erreur',
        description: 'La date de départ doit être après la date d\'arrivée',
        variant: 'destructive',
      })
      return
    }

    // Vérifier que les dates ne sont pas dans le passé (sauf pour les modifications)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (!isEditMode && start < today) {
      toast({
        title: 'Erreur',
        description: 'Vous ne pouvez pas créer une réservation dans le passé',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const url = isEditMode ? `/api/reservations/${reservation.id}` : '/api/reservations'
      const method = isEditMode ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          guests: parseInt(guests.toString()),
          comment: comment || null,
          ...(isEditMode && { status }),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue')
      }

      toast({
        title: isEditMode ? 'Réservation modifiée !' : 'Réservation créée !',
        description: isEditMode
          ? 'La réservation a été modifiée avec succès.'
          : 'La réservation a été créée et approuvée automatiquement.',
      })

      onOpenChange(false)
      onSuccess?.()
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Modifier la réservation' : 'Nouvelle réservation'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Modifiez les détails de la réservation. Vous pouvez modifier les dates, le nombre de personnes, le commentaire et le statut.'
              : 'Créez une nouvelle réservation pour un membre. Elle sera automatiquement approuvée.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userId">Membre *</Label>
            <Select
              value={userId}
              onValueChange={setUserId}
              disabled={isSubmitting || isLoadingUsers}
            >
              <SelectTrigger id="userId">
                <SelectValue placeholder="Sélectionner un membre" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date d&apos;arrivée *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Date de départ *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guests">Nombre de personnes *</Label>
            <Input
              id="guests"
              type="number"
              min="1"
              value={guests}
              onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
              required
              disabled={isSubmitting}
            />
          </div>

          {isEditMode && (
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as ReservationStatus)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ReservationStatus.PENDING}>En attente</SelectItem>
                  <SelectItem value={ReservationStatus.APPROVED}>Approuvée</SelectItem>
                  <SelectItem value={ReservationStatus.REJECTED}>Refusée</SelectItem>
                  <SelectItem value={ReservationStatus.CANCELLED}>Annulée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="comment">Commentaire (optionnel)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ajoutez un commentaire..."
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoadingUsers}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? 'Modification...' : 'Création...'}
                </>
              ) : (
                isEditMode ? 'Modifier' : 'Créer'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


