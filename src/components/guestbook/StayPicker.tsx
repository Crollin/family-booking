'use client'

import { Reservation } from '@/types'
import { cn } from '@/lib/utils'
import { format, differenceInCalendarDays, isWithinInterval, isAfter } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CalendarDays, Check, Moon } from 'lucide-react'

const NONE_VALUE = 'none'

interface StayPickerProps {
  reservations: Reservation[]
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
  id?: string
}

export type StayTiming = 'past' | 'current' | 'upcoming'

export function getStayTiming(start: Date, end: Date, now = new Date()): StayTiming {
  if (isWithinInterval(now, { start, end })) return 'current'
  if (isAfter(start, now)) return 'upcoming'
  return 'past'
}

export function getTimingLabel(timing: StayTiming, start: Date, end: Date, now = new Date()): string {
  if (timing === 'current') return 'En cours'
  if (timing === 'upcoming') {
    const days = differenceInCalendarDays(start, now)
    if (days <= 0) return 'Bientôt'
    if (days === 1) return 'Dans 1 jour'
    if (days < 30) return `Dans ${days} jours`
    return 'À venir'
  }
  const days = differenceInCalendarDays(now, end)
  if (days <= 1) return 'Hier'
  if (days < 30) return `Il y a ${days} jours`
  if (days < 60) return 'Il y a 1 mois'
  const months = Math.floor(days / 30)
  if (months < 12) return `Il y a ${months} mois`
  const years = Math.floor(months / 12)
  return years === 1 ? 'Il y a 1 an' : `Il y a ${years} ans`
}

export function getStayTitle(start: Date, end: Date): string {
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  if (sameMonth) {
    return format(start, 'MMMM yyyy', { locale: fr })
  }
  const sameYear = start.getFullYear() === end.getFullYear()
  if (sameYear) {
    return `${format(start, 'MMM', { locale: fr })} - ${format(end, 'MMM yyyy', { locale: fr })}`
  }
  return `${format(start, 'MMM yyyy', { locale: fr })} - ${format(end, 'MMM yyyy', { locale: fr })}`
}

export function getDateRangeLabel(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear()
  if (sameYear) {
    return `${format(start, 'd MMM', { locale: fr })} au ${format(end, 'd MMM yyyy', { locale: fr })}`
  }
  return `${format(start, 'd MMM yyyy', { locale: fr })} au ${format(end, 'd MMM yyyy', { locale: fr })}`
}

function capitalize(label: string): string {
  if (!label) return label
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function StayPicker({
  reservations,
  value,
  onChange,
  disabled = false,
  id = 'stay-picker',
}: StayPickerProps) {
  const selectedValue = value ?? NONE_VALUE

  const sorted = [...reservations].sort((a, b) => {
    const aStart = new Date(a.startDate).getTime()
    const bStart = new Date(b.startDate).getTime()
    return bStart - aStart
  })

  const groupedByYear = sorted.reduce<Record<string, Reservation[]>>((acc, reservation) => {
    const year = String(new Date(reservation.startDate).getFullYear())
    if (!acc[year]) acc[year] = []
    acc[year].push(reservation)
    return acc
  }, {})

  const years = Object.keys(groupedByYear).sort((a, b) => Number(b) - Number(a))

  const select = (next: string) => {
    if (disabled) return
    onChange(next === NONE_VALUE ? null : next)
  }

  return (
    <div className="grid gap-2">
      <div
        id={id}
        role="radiogroup"
        aria-label="Séjour associé"
        className="max-h-[280px] space-y-4 overflow-y-auto overscroll-contain rounded-lg border border-border/80 bg-muted/20 p-2 sm:p-3"
      >
        <button
          type="button"
          role="radio"
          aria-checked={selectedValue === NONE_VALUE}
          disabled={disabled}
          onClick={() => select(NONE_VALUE)}
          className={cn(
            'flex w-full items-start gap-3 rounded-md border px-3 py-3 text-left transition-colors active:scale-[0.99]',
            selectedValue === NONE_VALUE
              ? 'border-primary bg-primary/5 shadow-sm'
              : 'border-transparent bg-background/80 hover:border-border hover:bg-background',
            disabled && 'pointer-events-none opacity-60'
          )}
        >
          <span
            className={cn(
              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
              selectedValue === NONE_VALUE
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-muted-foreground/40'
            )}
            aria-hidden
          >
            {selectedValue === NONE_VALUE && <Check className="h-3 w-3" strokeWidth={2.5} />}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium">Sans séjour précis</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Le souvenir restera libre, sans lien avec une réservation.
            </span>
          </span>
        </button>

        {years.map((year) => (
          <div key={year} className="space-y-2">
            {years.length > 1 && (
              <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {year}
              </p>
            )}
            <div className="space-y-2">
              {groupedByYear[year].map((reservation) => {
                const start = new Date(reservation.startDate)
                const end = new Date(reservation.endDate)
                const nights = Math.max(1, differenceInCalendarDays(end, start))
                const timing = getStayTiming(start, end)
                const isSelected = selectedValue === reservation.id
                const title = capitalize(getStayTitle(start, end))

                return (
                  <button
                    key={reservation.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={disabled}
                    onClick={() => select(reservation.id)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-md border px-3 py-3 text-left transition-colors active:scale-[0.99]',
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-transparent bg-background/80 hover:border-border hover:bg-background',
                      disabled && 'pointer-events-none opacity-60'
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/40'
                      )}
                      aria-hidden
                    >
                      {isSelected && <Check className="h-3 w-3" strokeWidth={2.5} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="text-sm font-medium capitalize">{title}</span>
                        <span
                          className={cn(
                            'text-xs',
                            timing === 'current' && 'font-medium text-primary',
                            timing === 'upcoming' && 'text-muted-foreground',
                            timing === 'past' && 'text-muted-foreground'
                          )}
                        >
                          {getTimingLabel(timing, start, end)}
                        </span>
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                          {getDateRangeLabel(start, end)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Moon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                          {nights} nuit{nights > 1 ? 's' : ''}
                        </span>
                        {reservation.guests > 0 && (
                          <span>
                            {reservation.guests} voyageur{reservation.guests > 1 ? 's' : ''}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Plusieurs souvenirs peuvent être liés au même séjour.
      </p>
    </div>
  )
}

