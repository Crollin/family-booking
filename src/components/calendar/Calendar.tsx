'use client'

import { useId, useMemo, useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, startOfDay, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Reservation, ReservationStatus } from '@/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isDateInRange } from '@/lib/utils'

interface CalendarProps {
  reservations: Reservation[]
  onDateClick?: (date: Date) => void
  onReservationClick?: (reservation: Reservation) => void
  selectedStartDate?: Date | null
  selectedEndDate?: Date | null
}

export function Calendar({ reservations, onDateClick, onReservationClick, selectedStartDate, selectedEndDate }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const labelId = useId()
  const gridId = useId()

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: fr })

  const selectionAnnouncement = useMemo(() => {
    if (selectedStartDate && selectedEndDate) {
      return `Période sélectionnée du ${format(selectedStartDate, 'd MMMM yyyy', { locale: fr })} au ${format(selectedEndDate, 'd MMMM yyyy', { locale: fr })}`
    }
    if (selectedStartDate) {
      return `Date de début sélectionnée : ${format(selectedStartDate, 'd MMMM yyyy', { locale: fr })}. Choisissez une date de fin.`
    }
    return 'Aucune période sélectionnée'
  }, [selectedStartDate, selectedEndDate])

  const normalizeDateOnly = (value: Date | string) => {
    return startOfDay(typeof value === 'string' ? parseISO(value) : value)
  }

  const getReservationForDate = (date: Date): Reservation | null => {
    const day = startOfDay(date)
    for (const reservation of reservations) {
      const start = normalizeDateOnly(reservation.startDate)
      const end = normalizeDateOnly(reservation.endDate)
      if (isDateInRange(day, start, end)) {
        return reservation
      }
    }
    return null
  }

  const getTooltipText = (reservation: Reservation): string => {
    const userName = reservation.user?.name || reservation.user?.email || 'Utilisateur'
    const startDate = format(normalizeDateOnly(reservation.startDate), 'dd MMMM yyyy', { locale: fr })
    const endDate = format(normalizeDateOnly(reservation.endDate), 'dd MMMM yyyy', { locale: fr })
    const statusLabels = {
      [ReservationStatus.PENDING]: 'En attente',
      [ReservationStatus.APPROVED]: 'Confirmé',
      [ReservationStatus.REJECTED]: 'Refusé',
      [ReservationStatus.CANCELLED]: 'Annulé',
    }
    return `${userName}\n${startDate} - ${endDate}\n${reservation.guests} personne${reservation.guests > 1 ? 's' : ''}\nStatut: ${statusLabels[reservation.status]}`
  }

  const getStatusColor = (status: ReservationStatus | null) => {
    switch (status) {
      case ReservationStatus.APPROVED:
        return 'bg-primary text-primary-foreground'
      case ReservationStatus.PENDING:
        return 'bg-warning text-primary-foreground'
      case ReservationStatus.REJECTED:
        return 'bg-destructive text-destructive-foreground'
      case ReservationStatus.CANCELLED:
        return 'bg-muted text-muted-foreground'
      default:
        return 'bg-success text-primary-foreground hover:bg-success/80'
    }
  }

  const isSelected = (date: Date) => {
    if (selectedStartDate && isSameDay(date, selectedStartDate)) return true
    if (selectedEndDate && isSameDay(date, selectedEndDate)) return true
    if (selectedStartDate && selectedEndDate) {
      return date >= selectedStartDate && date <= selectedEndDate
    }
    return false
  }

  const isPast = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  return (
    <Card className="p-4 sm:p-6 animate-fade-up motion-reduce:animate-none">
      <div className="flex items-center gap-3 mb-4">
        <CalendarIcon className="h-5 w-5 text-muted-foreground shrink-0" strokeWidth={1.5} aria-hidden />
        <h2 id={labelId} className="text-xl sm:text-2xl font-semibold tracking-tight">
          Calendrier des disponibilités
        </h2>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-medium capitalize" aria-live="polite">
          {monthLabel}
        </h3>
        <div className="flex gap-1.5 sm:gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            aria-label={`Mois précédent, ${format(subMonths(currentMonth, 1), 'MMMM yyyy', { locale: fr })}`}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            aria-label={`Mois suivant, ${format(addMonths(currentMonth, 1), 'MMMM yyyy', { locale: fr })}`}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      <div
        id={gridId}
        role="grid"
        aria-labelledby={labelId}
        className="grid grid-cols-7 gap-1 sm:gap-2"
      >
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
          <div
            key={day}
            role="columnheader"
            aria-label={day}
            className="text-center font-medium text-xs sm:text-sm text-muted-foreground py-1.5 sm:py-2"
          >
            <span aria-hidden className="sm:hidden">{day.charAt(0)}</span>
            <span aria-hidden className="hidden sm:inline">{day}</span>
          </div>
        ))}

        {days.map((day) => {
          const reservation = getReservationForDate(day)
          const status = reservation ? reservation.status : null
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isSelectedDate = isSelected(day)
          const isPastDate = isPast(day)
          const userName = reservation?.user?.name || reservation?.user?.email || null
          const displayName = userName ? (userName.length > 8 ? userName.substring(0, 8) + '...' : userName) : null

          const hasActiveReservation = reservation &&
            (status === ReservationStatus.PENDING || status === ReservationStatus.APPROVED)

          const handleClick = () => {
            if (isPastDate) return

            if (hasActiveReservation && reservation) {
              onReservationClick?.(reservation)
            } else {
              onDateClick?.(day)
            }
          }

          const dayLabel = format(day, 'EEEE d MMMM yyyy', { locale: fr })
          const statusPart = status
            ? `, ${status === ReservationStatus.APPROVED ? 'réservé' : status === ReservationStatus.PENDING ? 'en attente' : 'indisponible'}`
            : ', disponible'
          const selectionPart = isSelectedDate ? ', sélectionné' : ''

          return (
            <button
              key={day.toISOString()}
              type="button"
              role="gridcell"
              onClick={handleClick}
              disabled={isPastDate}
              aria-label={`${dayLabel}${statusPart}${selectionPart}`}
              aria-selected={isSelectedDate}
              aria-disabled={isPastDate}
              title={reservation ? getTooltipText(reservation) : undefined}
              className={cn(
                'min-h-11 sm:h-12 rounded-md transition-colors text-sm font-medium relative touch-manipulation',
                'font-mono tabular-nums',
                !isCurrentMonth && 'opacity-30',
                isPastDate && 'opacity-50 cursor-not-allowed',
                isSelectedDate && 'ring-2 ring-primary ring-offset-1 sm:ring-offset-2',
                status ? getStatusColor(status) : 'bg-success text-primary-foreground hover:bg-success/80',
                !isPastDate && !status && 'hover:brightness-95',
                hasActiveReservation && 'cursor-pointer'
              )}
            >
              <div className="flex flex-col items-center justify-center h-full px-0.5 py-1">
                <span>{format(day, 'd')}</span>
                {displayName && (
                  <span className="hidden sm:block text-[10px] leading-tight mt-0.5 truncate w-full px-1 font-sans font-normal">
                    {displayName}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {selectionAnnouncement}
      </div>

      <div className="mt-5 sm:mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-primary" aria-hidden />
          <span>Réservé</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-warning" aria-hidden />
          <span>En attente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-success" aria-hidden />
          <span>Disponible</span>
        </div>
      </div>

      <p className="mt-3 sm:mt-4 text-sm text-muted-foreground leading-relaxed">
        Sélectionnez une période en cliquant sur la date de début puis la date de fin. Les dates réservées apparaissent en bleu, les demandes en attente en orange.
      </p>
    </Card>
  )
}
