'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Calendar as CalendarIcon, Send } from 'lucide-react'
import { fr } from 'date-fns/locale'

interface ReservationFormProps {
  startDate: Date | null
  endDate: Date | null
  onSuccess?: () => void
}

export function ReservationForm({ startDate, endDate, onSuccess }: ReservationFormProps) {
  const { toast } = useToast()
  const [guests, setGuests] = useState(1)
  const [comment, setComment] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!startDate || !endDate) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner des dates',
        variant: 'destructive',
      })
      return
    }

    if (startDate >= endDate) {
      toast({
        title: 'Erreur',
        description: 'La date de départ doit être après la date d\'arrivée',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const { apiPost } = await import('@/lib/api-client')
      const normalizeForApi = (date: Date) => {
        const copy = new Date(date)
        // Forcer l'heure en UTC pour éviter les décalages de fuseau (jour conservé)
        copy.setUTCHours(12, 0, 0, 0)
        return copy.toISOString()
      }

      const response = await apiPost('/api/reservations', {
        startDate: normalizeForApi(startDate),
        endDate: normalizeForApi(endDate),
        guests,
        comment: comment || null,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue')
      }

      toast({
        title: 'Réservation créée !',
        description: 'Votre demande de réservation a été envoyée et est en attente de validation.',
      })

      setGuests(1)
      setComment('')
      onSuccess?.()
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la création de la réservation.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getDateRangeText = () => {
    if (!startDate && !endDate) {
      return 'Aucune date sélectionnée'
    }
    if (startDate && !endDate) {
      return format(startDate, 'dd MMMM yyyy', { locale: fr })
    }
    if (startDate && endDate) {
      return `${format(startDate, 'dd MMMM', { locale: fr })} - ${format(endDate, 'dd MMMM yyyy', { locale: fr })}`
    }
    return 'Aucune date sélectionnée'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" strokeWidth={1.5} />
          Demande de réservation
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Choisissez vos dates ci-dessus, puis complétez et envoyez la demande.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <div className="space-y-2">
              <Label htmlFor="dates">Dates sélectionnées</Label>
              <Input
                id="dates"
                type="text"
                value={getDateRangeText()}
                disabled
                className="bg-muted border-dashed"
                placeholder="Aucune date sélectionnée"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guests">Personnes</Label>
              <Input
                id="guests"
                type="number"
                min="1"
                value={guests}
                onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Commentaire (optionnel)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Informations complémentaires..."
              disabled={isLoading}
              rows={3}
            />
          </div>

          <Button
            type="submit"
            className="w-full sm:w-auto"
            disabled={isLoading || !startDate || !endDate}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Envoyer la demande
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

