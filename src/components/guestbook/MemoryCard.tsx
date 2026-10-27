'use client'

import { GuestbookEntry } from '@/types'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useSession } from '@/hooks/useSession'
import { useState, type CSSProperties } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { apiDelete } from '@/lib/api-client'
import { PhotoGallery } from './PhotoGallery'

interface MemoryCardProps {
  entry: GuestbookEntry
  onEdit?: (entry: GuestbookEntry) => void
  onDelete?: () => void
  style?: CSSProperties
}

export function MemoryCard({ entry, onEdit, onDelete, style }: MemoryCardProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showFullMessage, setShowFullMessage] = useState(false)

  const isOwner = session?.user?.id === entry.userId
  const userName = entry.user?.name || entry.user?.email || 'Utilisateur'
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const getReservationLabel = () => {
    if (!entry.reservation) return null
    const startDate = new Date(entry.reservation.startDate)
    const month = format(startDate, 'MMMM yyyy', { locale: fr })
    return `Séjour en ${month}`
  }

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce souvenir ?')) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await apiDelete(`/api/guestbook/${entry.id}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la suppression')
      }

      toast({
        title: 'Souvenir supprimé',
        description: 'Le souvenir a été supprimé avec succès',
      })

      if (onDelete) {
        onDelete()
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue'
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const isLongMessage = entry.message.length > 220
  const messagePreview =
    isLongMessage && !showFullMessage
      ? entry.message.substring(0, 220) + '...'
      : entry.message

  const photos = (entry.photos ?? []).map((photo, index) => {
    if (typeof photo === 'string') {
      return { id: String(index), url: photo }
    }
    return { id: photo.id, url: photo.url }
  })

  const stayLabel = getReservationLabel()

  return (
    <article
      style={style}
      className="animate-fade-up overflow-hidden rounded-lg border border-border/80 bg-card text-card-foreground shadow-[0_12px_40px_-16px_hsl(220_30%_18%/0.14)] dark:shadow-[0_12px_40px_-16px_hsl(220_25%_4%/0.5)]"
    >
      {photos.length > 0 && <PhotoGallery photos={photos} />}

      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary ring-1 ring-primary/15"
            aria-hidden
          >
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold leading-tight">{userName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              {stayLabel && <span>{stayLabel}</span>}
              {stayLabel && <span aria-hidden className="text-border">/</span>}
              <time dateTime={new Date(entry.createdAt).toISOString()}>
                {format(new Date(entry.createdAt), 'd MMMM yyyy', { locale: fr })}
              </time>
            </div>
          </div>
          {isOwner && (
            <div className="flex shrink-0 gap-0.5">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(entry)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  aria-label="Modifier le souvenir"
                >
                  <Pencil className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                aria-label="Supprimer le souvenir"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </div>
          )}
        </div>

        <p className="text-[15px] leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {messagePreview}
        </p>
        {isLongMessage && (
          <button
            type="button"
            onClick={() => setShowFullMessage(!showFullMessage)}
            className="text-sm font-medium text-primary hover:underline"
          >
            {showFullMessage ? 'Voir moins' : 'Voir plus'}
          </button>
        )}
      </div>
    </article>
  )
}

export function MemoryCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border/80 bg-card">
      <div className="aspect-[16/10] animate-pulse bg-muted" />
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
            <div className="h-3 w-44 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3.5 w-full rounded bg-muted animate-pulse" />
          <div className="h-3.5 w-4/5 rounded bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  )
}
