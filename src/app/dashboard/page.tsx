'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Calendar } from '@/components/calendar/Calendar'
import { ReservationForm } from '@/components/calendar/ReservationForm'
import { ReservationDetailsDialog } from '@/components/calendar/ReservationDetailsDialog'
import { Reservation } from '@/types'
import { format, startOfDay, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ReservationStatus } from '@/types'
import { PropertyInfo } from '@/components/PropertyInfo'
import { WeatherWidget } from '@/components/weather/WeatherWidget'
import { PracticalInfoReminder } from '@/components/dashboard/PracticalInfoReminder'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { isDateInRange } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { PageHeader } from '@/components/layout/PageHeader'
import { Calendar as CalendarIcon, User, Users, List } from 'lucide-react'

export default function DashboardPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null)
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [isAllReservationsSheetOpen, setIsAllReservationsSheetOpen] = useState(false)

  const upcomingReservations = useMemo(
    () =>
      reservations
        .filter((r) => {
          const end = new Date(r.endDate)
          return end >= new Date() && r.status === ReservationStatus.APPROVED
        })
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [reservations]
  )

  const fetchReservations = useCallback(async () => {
    try {
      const { apiGet } = await import('@/lib/api-client')
      const response = await apiGet('/api/reservations')
      if (response.ok) {
        const data = await response.json()
        setReservations(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des réservations:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReservations()
  }, [fetchReservations])

  useEffect(() => {
    const supabase = createClientSupabaseClient()
    const channel = supabase
      .channel('reservations-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => {
          fetchReservations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchReservations])

  const normalizeDateOnly = (value: Date | string) => {
    return startOfDay(typeof value === 'string' ? parseISO(value) : value)
  }

  const isDateReserved = (date: Date): boolean => {
    const day = startOfDay(date)
    return reservations.some((reservation) => {
      if (reservation.status !== ReservationStatus.PENDING && 
          reservation.status !== ReservationStatus.APPROVED) {
        return false
      }
      const start = normalizeDateOnly(reservation.startDate)
      const end = normalizeDateOnly(reservation.endDate)
      return isDateInRange(day, start, end)
    })
  }

  const handleDateClick = (date: Date) => {
    // Vérifier que la date n'est pas déjà réservée (sécurité supplémentaire)
    if (isDateReserved(date)) {
      return
    }

    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      setSelectedStartDate(date)
      setSelectedEndDate(null)
    } else if (selectedStartDate && !selectedEndDate) {
      if (date < selectedStartDate) {
        setSelectedStartDate(date)
        setSelectedEndDate(null)
      } else {
        setSelectedEndDate(date)
      }
    }
  }

  const handleReservationClick = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setIsDetailsDialogOpen(true)
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

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  const renderUpcomingRow = (reservation: Reservation) => {
    const startDate = new Date(reservation.startDate)
    const endDate = new Date(reservation.endDate)
    const startFormatted = format(startDate, 'd MMM', { locale: fr })
    const endFormatted = format(endDate, 'd MMM yyyy', { locale: fr })

    return (
      <li key={reservation.id} role="listitem">
        <button
          type="button"
          className="w-full text-left py-3.5 px-1 transition-colors duration-200 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          onClick={() => handleReservationClick(reservation)}
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
            <Badge className="bg-primary text-primary-foreground shrink-0">
              Confirmée
            </Badge>
            <span className="flex items-center gap-1.5 text-foreground">
              <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {reservation.user?.name || 'Utilisateur'}
            </span>
            <span className="text-muted-foreground" aria-hidden>
              -
            </span>
            <span className="flex items-center gap-1.5 text-foreground">
              <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {startFormatted} → {endFormatted}
            </span>
            <span className="text-muted-foreground" aria-hidden>
              -
            </span>
            <span className="flex items-center gap-1.5 text-foreground">
              <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {reservation.guests} pers.
            </span>
          </div>
          {reservation.comment ? (
            <p className="mt-1.5 text-xs text-muted-foreground italic line-clamp-1">
              {reservation.comment}
            </p>
          ) : null}
        </button>
      </li>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Réserver l'appartement"
        description="Sélectionnez vos dates sur le calendrier et envoyez votre demande de réservation."
      />

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Parcours principal : sélectionner → demander */}
        <div className="lg:col-span-2 space-y-6">
          <Calendar
            reservations={reservations}
            onDateClick={handleDateClick}
            onReservationClick={handleReservationClick}
            selectedStartDate={selectedStartDate}
            selectedEndDate={selectedEndDate}
          />

          <ReservationForm
            startDate={selectedStartDate}
            endDate={selectedEndDate}
            onSuccess={() => {
              setSelectedStartDate(null)
              setSelectedEndDate(null)
              fetchReservations()
            }}
          />
        </div>

        {/* Contexte : météo + prochaines résas */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <WeatherWidget />

          <section className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 sm:p-5">
            <h2 className="text-base font-semibold tracking-tight text-foreground mb-3">
              Prochaines réservations
            </h2>

            {upcomingReservations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Aucune réservation à venir
              </p>
            ) : (
              <>
                <ul
                  className="divide-y divide-border max-h-[320px] overflow-y-auto"
                  role="list"
                >
                  {upcomingReservations.slice(0, 4).map(renderUpcomingRow)}
                </ul>
                {upcomingReservations.length > 4 && (
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => setIsAllReservationsSheetOpen(true)}
                  >
                    <List className="h-4 w-4 mr-2" />
                    Voir toutes ({upcomingReservations.length})
                  </Button>
                )}

                <Sheet open={isAllReservationsSheetOpen} onOpenChange={setIsAllReservationsSheetOpen}>
                  <SheetContent side="right" className="w-full sm:max-w-md overflow-hidden flex flex-col">
                    <SheetHeader>
                      <SheetTitle>Prochaines réservations</SheetTitle>
                    </SheetHeader>
                    <ul
                      className="flex-1 overflow-y-auto mt-4 divide-y divide-border pr-2"
                      role="list"
                    >
                      {upcomingReservations.map(renderUpcomingRow)}
                    </ul>
                  </SheetContent>
                </Sheet>
              </>
            )}
          </section>

          <PracticalInfoReminder />
        </aside>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <PropertyInfo />
      </div>

      <ReservationDetailsDialog
        reservation={selectedReservation}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
      />
    </div>
  )
}

