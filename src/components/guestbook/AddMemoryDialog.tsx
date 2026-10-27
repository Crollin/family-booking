'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSiteBranding } from '@/hooks/useSiteBranding'
import { Reservation, ReservationStatus, GuestbookEntry } from '@/types'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Upload, X, Loader2 } from 'lucide-react'
import { apiPost } from '@/lib/api-client'
import { MAX_MEDIA_FILE_SIZE, MAX_MEDIA_FILE_SIZE_LABEL } from '@/lib/upload-limits'
import { StayPicker } from '@/components/guestbook/StayPicker'

interface AddMemoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  preselectedReservationId?: string
  editingEntry?: GuestbookEntry | null
}

export function AddMemoryDialog({
  open,
  onOpenChange,
  onSuccess,
  preselectedReservationId,
  editingEntry,
}: AddMemoryDialogProps) {
  const { siteName } = useSiteBranding()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(
    preselectedReservationId || null
  )
  const [message, setMessage] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingReservations, setIsLoadingReservations] = useState(false)
  const { toast } = useToast()

  const fetchReservations = useCallback(async () => {
    setIsLoadingReservations(true)
    try {
      const { apiGet } = await import('@/lib/api-client')
      const response = await apiGet('/api/reservations')
      if (response.ok) {
        const data = await response.json()
        // Filtrer seulement les réservations approuvées
        const approvedReservations = data.filter(
          (r: Reservation) => r.status === ReservationStatus.APPROVED
        )
        setReservations(approvedReservations)
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les réservations',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingReservations(false)
    }
  }, [toast])

  useEffect(() => {
    if (open) {
      fetchReservations()
      if (editingEntry) {
        setSelectedReservationId(editingEntry.reservationId || null)
        setMessage(editingEntry.message)
        // Convertir GuestbookPhoto[] en string[] (URLs)
        setPhotos(
          editingEntry.photos
            ? editingEntry.photos.map((photo) => (typeof photo === 'string' ? photo : photo.url))
            : []
        )
      } else if (preselectedReservationId) {
        setSelectedReservationId(preselectedReservationId)
      }
    } else {
      // Reset form when dialog closes
      setSelectedReservationId(preselectedReservationId || null)
      setMessage('')
      setPhotos([])
      setUploadingPhotos([])
    }
  }, [open, preselectedReservationId, editingEntry, fetchReservations])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    if (photos.length + files.length > 10) {
      toast({
        title: 'Trop de photos',
        description: 'Vous ne pouvez ajouter que 10 photos maximum',
        variant: 'destructive',
      })
      return
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // Vérifier le type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Type de fichier invalide',
          description: 'Seules les images sont autorisées',
          variant: 'destructive',
        })
        continue
      }

      // Vérifier la taille
      if (file.size > MAX_MEDIA_FILE_SIZE) {
        toast({
          title: 'Fichier trop volumineux',
          description: `La taille maximale est de ${MAX_MEDIA_FILE_SIZE_LABEL} par photo`,
          variant: 'destructive',
        })
        continue
      }

      const fileId = `${Date.now()}-${i}`
      setUploadingPhotos((prev) => [...prev, fileId])

      try {
        const formData = new FormData()
        formData.append('file', file)

        // Utiliser fetch directement pour FormData (apiPost stringifie les objets)
        const response = await fetch('/api/guestbook/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Erreur lors de l\'upload')
        }

        const data = await response.json()
        
        // L'API retourne { photos: [...] } même pour un seul fichier
        if (data.photos && data.photos.length > 0) {
          setPhotos((prev) => [...prev, data.photos[0].url])
        } else {
          throw new Error('Aucune photo uploadée - réponse invalide du serveur')
        }
      } catch (error: any) {
        console.error('Erreur upload:', error)
        toast({
          title: 'Erreur',
          description: error.message || 'Erreur lors de l\'upload de la photo',
          variant: 'destructive',
        })
      } finally {
        setUploadingPhotos((prev) => prev.filter((id) => id !== fileId))
      }
    }

    // Reset input
    e.target.value = ''
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({
        title: 'Message requis',
        description: 'Veuillez saisir un message',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      let response
      if (editingEntry) {
        // Mise à jour
        const { apiPut } = await import('@/lib/api-client')
        response = await apiPut(`/api/guestbook/${editingEntry.id}`, {
          message: message.trim(),
          photos,
          reservationId: selectedReservationId,
        })
      } else {
        response = await apiPost('/api/guestbook', {
          reservationId: selectedReservationId,
          message: message.trim(),
          photos,
        })
      }

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Erreur lors de ${editingEntry ? 'la mise à jour' : 'la création'} du souvenir`)
      }

      toast({
        title: editingEntry ? 'Souvenir modifié !' : 'Souvenir ajouté !',
        description: editingEntry
          ? 'Votre souvenir a été modifié avec succès'
          : 'Votre souvenir a été publié. Les autres membres ont été prévenus par e-mail.',
      })

      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('Erreur:', error)
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{editingEntry ? 'Modifier le souvenir' : 'Partager un souvenir'}</DialogTitle>
          <DialogDescription>
            {editingEntry
              ? 'Modifiez votre message et vos photos.'
              : 'Racontez votre séjour à ' + siteName + ' et partagez vos plus belles photos.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-stay-picker">Séjour concerné</Label>
            {isLoadingReservations ? (
              <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                Chargement des séjours...
              </div>
            ) : reservations.length > 0 ? (
              <StayPicker
                id="edit-stay-picker"
                reservations={reservations}
                value={selectedReservationId}
                onChange={setSelectedReservationId}
                disabled={isSubmitting}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun séjour approuvé à associer pour le moment.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Votre message</Label>
            <Textarea
              id="message"
              placeholder="Partagez vos meilleurs moments, anecdotes, recommandations..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label>Photos ({photos.length}/10)</Label>
            <div className="space-y-2">
              <label
                htmlFor="photo-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-gray-500" />
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold">Cliquez pour ajouter</span>
                    <span className="hidden sm:inline"> ou glissez-déposez</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    JPG, PNG ou WebP (MAX. {MAX_MEDIA_FILE_SIZE_LABEL})
                  </p>
                </div>
                <input
                  id="photo-upload"
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  multiple
                  onChange={handleFileSelect}
                  disabled={photos.length >= 10 || uploadingPhotos.length > 0}
                />
              </label>

              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photoUrl, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photoUrl}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-24 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {uploadingPhotos.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Upload en cours...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || uploadingPhotos.length > 0}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {editingEntry ? 'Modification...' : 'Publication...'}
              </>
            ) : (
              editingEntry ? 'Modifier' : 'Publier'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

