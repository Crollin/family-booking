'use client'

import type { FilterCategory } from '@/lib/local-guide/constants'
import type { LocalGuideSeason } from '@/types'
import { SEASON_LABELS } from '@/lib/local-guide/constants'
import { MapPin } from 'lucide-react'

interface LocalGuideEmptyStateProps {
  hasSearch: boolean
  filterCategory: FilterCategory
  activitySeason?: LocalGuideSeason
  activitiesEmptyForSeason?: boolean
  activityTypeActive?: boolean
}

export function LocalGuideEmptyState({
  hasSearch,
  filterCategory,
  activitySeason,
  activitiesEmptyForSeason,
  activityTypeActive,
}: LocalGuideEmptyStateProps) {
  let message = 'Aucun point d\'intérêt ne correspond à votre recherche.'

  if (activitiesEmptyForSeason && activitySeason) {
    const otherSeason = activitySeason === 'hiver' ? 'Été' : 'Hiver'
    message = `Aucune activité pour ${SEASON_LABELS[activitySeason].toLowerCase()}. Essayez le mode ${otherSeason}.`
  } else if (activityTypeActive) {
    message = 'Aucune activité de ce type pour le moment.'
  } else if (!hasSearch && filterCategory !== 'all') {
    message = 'Aucune adresse dans cette catégorie pour le moment.'
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <MapPin className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground max-w-md">{message}</p>
    </div>
  )
}
