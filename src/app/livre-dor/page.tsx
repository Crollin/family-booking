'use client'

import { useState, useEffect, useCallback } from 'react'
import { MemoryCard, MemoryCardSkeleton } from '@/components/guestbook/MemoryCard'
import { AddMemoryDialog } from '@/components/guestbook/AddMemoryDialog'
import { GuestbookForm } from '@/components/guestbook/GuestbookForm'
import { GuestbookEntry as GuestbookEntryType, Reservation } from '@/types'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { apiGet } from '@/lib/api-client'
import { useSiteBranding } from '@/hooks/useSiteBranding'
import { BookOpen, Camera } from 'lucide-react'

export default function LivreDorPage() {
  const { siteName } = useSiteBranding()
  const { toast } = useToast()
  const [entries, setEntries] = useState<GuestbookEntryType[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null)
  const [editingEntry, setEditingEntry] = useState<GuestbookEntryType | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setSearchParams(params)
      const reservationId = params.get('reservationId')
      if (reservationId) {
        setShowForm(true)
      }
    }
  }, [])

  const fetchEntries = useCallback(async () => {
    try {
      const response = await apiGet('/api/guestbook')
      if (response.ok) {
        const data = await response.json()
        setEntries(data)
      } else {
        throw new Error('Erreur lors du chargement')
      }
    } catch (error) {
      console.error('Erreur lors du chargement des entrées:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les souvenirs',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const fetchReservations = useCallback(async () => {
    try {
      const response = await apiGet('/api/reservations')
      if (response.ok) {
        const data = await response.json()
        setReservations(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des réservations:', error)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
    fetchReservations()
  }, [fetchEntries, fetchReservations])

  const handleFormSuccess = () => {
    setShowForm(false)
    fetchEntries()
    if (searchParams?.get('reservationId')) {
      window.history.replaceState({}, '', '/livre-dor')
    }
  }

  const handleEdit = (entry: GuestbookEntryType) => {
    setEditingEntry(entry)
    setIsEditDialogOpen(true)
  }

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false)
    setEditingEntry(null)
    fetchEntries()
  }

  const handleDeleteSuccess = () => {
    fetchEntries()
  }

  const preselectedReservationId = searchParams?.get('reservationId') || null

  const entryCountLabel = `${entries.length} souvenir${entries.length > 1 ? 's' : ''} partagé${entries.length > 1 ? 's' : ''}`

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <header className="mb-10 animate-fade-up">
        <p className="mb-3 text-sm font-medium text-primary">Souvenirs de famille</p>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight leading-[1.1] sm:text-5xl">
              Livre d&apos;Or
            </h1>
            <p className="max-w-[65ch] text-base leading-relaxed text-muted-foreground">
              Retrouvez les plus beaux souvenirs de la famille à {siteName}. Plusieurs moments peuvent être partagés pour un même séjour.
            </p>
          </div>
          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              size="lg"
              className="shrink-0 self-start active:scale-[0.98] sm:self-auto"
            >
              <Camera className="mr-2 h-5 w-5" strokeWidth={1.5} />
              Ajouter un souvenir
            </Button>
          )}
        </div>
      </header>

      {showForm && (
        <div className="mb-10 animate-fade-up">
          <GuestbookForm
            reservations={reservations}
            preselectedReservationId={preselectedReservationId}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setShowForm(false)
              if (searchParams?.get('reservationId')) {
                window.history.replaceState({}, '', '/livre-dor')
              }
            }}
          />
        </div>
      )}

      <section>
        {!isLoading && entries.length > 0 && (
          <p className="mb-5 text-sm text-muted-foreground">{entryCountLabel}</p>
        )}

        {isLoading ? (
          <div className="grid gap-6">
            <MemoryCardSkeleton />
            <MemoryCardSkeleton />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg border border-dashed border-border bg-card/50 px-6 py-16 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <BookOpen className="h-7 w-7 text-primary" strokeWidth={1.5} />
            </div>
            <p className="max-w-md text-muted-foreground">
              Aucun souvenir partagé pour le moment. Soyez le premier à partager vos moments à {siteName} !
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {entries.map((entry, index) => (
              <MemoryCard
                key={entry.id}
                entry={entry}
                onEdit={handleEdit}
                onDelete={handleDeleteSuccess}
                style={{ animationDelay: `${Math.min(index, 6) * 70}ms` }}
              />
            ))}
          </div>
        )}
      </section>

      <AddMemoryDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) {
            setEditingEntry(null)
          }
        }}
        onSuccess={handleEditSuccess}
        editingEntry={editingEntry}
      />
    </div>
  )
}
