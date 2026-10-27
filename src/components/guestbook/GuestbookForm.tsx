'use client'

import { useState, useRef } from 'react'
import { useSiteBranding } from '@/hooks/useSiteBranding'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Camera, X, Upload, Star } from 'lucide-react'
import { uploadPhotos, UploadedPhoto } from '@/lib/guestbook-upload'
import { apiPost } from '@/lib/api-client'
import { Reservation } from '@/types'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { StayPicker } from '@/components/guestbook/StayPicker'

interface GuestbookFormProps {
  reservations?: Reservation[]
  preselectedReservationId?: string | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function GuestbookForm({
  reservations = [],
  preselectedReservationId,
  onSuccess,
  onCancel,
}: GuestbookFormProps) {
  const { siteName } = useSiteBranding()
  const { toast } = useToast()
  const [message, setMessage] = useState('')
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(
    preselectedReservationId || null
  )
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const approvedReservations = reservations.filter(
    (r) => r.status === 'APPROVED'
  )

  const getStayPeriod = (reservation: Reservation | null) => {
    if (!reservation) return null
    const startDate = new Date(reservation.startDate)
    return format(startDate, 'MMMM yyyy', { locale: fr })
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (photos.length + files.length > 10) {
      toast({
        title: 'Erreur',
        description: 'Maximum 10 photos autorisées',
        variant: 'destructive',
      })
      return
    }

    setUploadingPhotos(true)

    try {
      const fileArray = Array.from(files)
      const uploaded = await uploadPhotos(fileArray)
      setPhotos([...photos, ...uploaded])
      toast({
        title: 'Photos uploadées',
        description: `${uploaded.length} photo(s) ajoutée(s) avec succès`,
      })
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de l\'upload des photos',
        variant: 'destructive',
      })
    } finally {
      setUploadingPhotos(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez saisir un message',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const reservationIdForApi = selectedReservationId
      const selectedReservation = reservationIdForApi
        ? approvedReservations.find((r) => r.id === reservationIdForApi)
        : null

      const stayPeriod = getStayPeriod(selectedReservation || null)

      const response = await apiPost('/api/guestbook', {
        message: message.trim(),
        reservationId: reservationIdForApi,
        stayPeriod,
        photos: photos.map((photo, index) => ({
          storagePath: photo.storagePath,
          url: photo.url,
          order: index,
        })),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Une erreur est survenue')
      }

      toast({
        title: 'Souvenir créé !',
        description: 'Votre souvenir a été publié. Les autres membres ont été prévenus par e-mail.',
      })

      setMessage('')
      setSelectedReservationId(preselectedReservationId || null)
      setPhotos([])
      onSuccess?.()
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la création',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="overflow-hidden border-border/80 shadow-[0_12px_40px_-16px_hsl(220_30%_18%/0.14)]">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Star className="h-5 w-5 text-primary" strokeWidth={1.5} />
          Ajouter un souvenir
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {approvedReservations.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="stay-picker">Séjour associé (optionnel)</Label>
              <StayPicker
                id="stay-picker"
                reservations={approvedReservations}
                value={selectedReservationId}
                onChange={setSelectedReservationId}
                disabled={isSubmitting}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="message">Votre souvenir</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Partagez vos meilleurs moments à ${siteName}...`}
              rows={6}
              required
            />
            <p className="text-xs text-muted-foreground">Quelques lignes suffisent. Les photos feront le reste.</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="photo-upload">Photos (optionnel, max 10)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              capture="environment"
              multiple
              onChange={handleFileSelect}
              className="sr-only"
              id="photo-upload"
              disabled={uploadingPhotos || photos.length >= 10}
            />
            <label
              htmlFor="photo-upload"
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 px-4 py-8 text-center transition-colors hover:border-primary/40 hover:bg-muted/70',
                (uploadingPhotos || photos.length >= 10) && 'pointer-events-none opacity-60'
              )}
            >
              {uploadingPhotos ? (
                <span className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />
                  Upload en cours...
                </span>
              ) : (
                <>
                  <Camera className="mb-2 h-6 w-6 text-primary" strokeWidth={1.5} />
                  <span className="text-sm font-medium">
                    {photos.length >= 10
                      ? 'Maximum atteint (10 photos)'
                      : 'Ajouter des photos'}
                  </span>
                  {photos.length < 10 && (
                    <span className="mt-1 text-xs text-muted-foreground">
                      JPEG, PNG ou WebP
                    </span>
                  )}
                </>
              )}
            </label>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {photos.map((photo, index) => (
                  <div key={index} className="group relative">
                    <img
                      src={photo.url}
                      alt={`Aperçu ${index + 1}`}
                      className="h-24 w-full rounded-md object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute right-1 top-1 h-6 w-6 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      onClick={() => removePhoto(index)}
                      aria-label={`Retirer la photo ${index + 1}`}
                    >
                      <X className="h-3 w-3" strokeWidth={1.5} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} className="active:scale-[0.98]">
                Annuler
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting} className="active:scale-[0.98]">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />
                  Envoi...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  Publier
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
