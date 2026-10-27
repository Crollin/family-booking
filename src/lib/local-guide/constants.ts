import type { LocalGuideCategory, LocalGuideSeason } from '@/types'
import {
  UtensilsCrossed,
  Mountain,
  Briefcase,
  Store,
  Snowflake,
  Sun,
  Footprints,
  Bike,
  Baby,
  Waves,
  MountainSnow,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getPropertyCoords } from '@/lib/site-branding'

export const NOT_PROVIDED = 'Non renseigné'

export const VIEW_STORAGE_KEY = 'guide-local-view'
export const SEASON_STORAGE_KEY = 'guide-local-season'

export const CATEGORY_ORDER: LocalGuideCategory[] = [
  'restaurant',
  'activite',
  'service',
  'commerce',
]

export const CATEGORY_LABELS: Record<LocalGuideCategory, string> = {
  restaurant: 'Restaurant',
  activite: 'Activité',
  service: 'Service',
  commerce: 'Commerce',
}

export const CATEGORY_PLURAL: Record<LocalGuideCategory, string> = {
  restaurant: 'Restaurants',
  activite: 'Activités',
  service: 'Services',
  commerce: 'Commerces',
}

export const CATEGORY_OPTIONS: { value: LocalGuideCategory; label: string }[] =
  CATEGORY_ORDER.map((value) => ({
    value,
    label: CATEGORY_LABELS[value],
  }))

export const CATEGORY_ICON_MAP: Record<LocalGuideCategory, LucideIcon> = {
  restaurant: UtensilsCrossed,
  activite: Mountain,
  service: Briefcase,
  commerce: Store,
}

export const CATEGORY_CARD_STYLES: Record<
  LocalGuideCategory,
  { badge: string; iconBg: string; iconText: string; border: string; gradient: string }
> = {
  restaurant: {
    badge: 'bg-guide-restaurant text-white border-0 hover:bg-guide-restaurant/90',
    iconBg: 'bg-guide-restaurant/15',
    iconText: 'text-guide-restaurant',
    border: 'border-guide-restaurant',
    gradient: 'from-guide-restaurant/20 to-guide-restaurant/5',
  },
  activite: {
    badge: 'bg-guide-activite text-white border-0 hover:bg-guide-activite/90',
    iconBg: 'bg-guide-activite/15',
    iconText: 'text-guide-activite',
    border: 'border-guide-activite',
    gradient: 'from-guide-activite/20 to-guide-activite/5',
  },
  service: {
    badge: 'bg-guide-service text-white border-0 hover:bg-guide-service/90',
    iconBg: 'bg-guide-service/15',
    iconText: 'text-guide-service',
    border: 'border-guide-service',
    gradient: 'from-guide-service/20 to-guide-service/5',
  },
  commerce: {
    badge: 'bg-guide-commerce text-white border-0 hover:bg-guide-commerce/90',
    iconBg: 'bg-guide-commerce/15',
    iconText: 'text-guide-commerce',
    border: 'border-guide-commerce',
    gradient: 'from-guide-commerce/20 to-guide-commerce/5',
  },
}

export type FilterCategory = LocalGuideCategory | 'all'

export const TAB_ACTIVE_STYLES: Record<FilterCategory, string> = {
  all: 'bg-primary text-primary-foreground',
  restaurant: 'bg-guide-restaurant text-white',
  activite: 'bg-guide-activite text-white',
  service: 'bg-guide-service text-white',
  commerce: 'bg-guide-commerce text-white',
}

export const SEASON_LABELS: Record<LocalGuideSeason, string> = {
  hiver: 'Hiver',
  ete: 'Été',
}

export const SEASON_OPTIONS: {
  value: LocalGuideSeason
  label: string
  icon: LucideIcon
}[] = [
  { value: 'hiver', label: 'Hiver', icon: Snowflake },
  { value: 'ete', label: 'Été', icon: Sun },
]

export function getMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

/** Itinéraire Google Maps depuis le logement jusqu’à une adresse / lieu de départ. */
export function getDirectionsFromProperty(destination: string): string {
  const { lat, lng } = getPropertyCoords()
  const origin = `${lat},${lng}`
  return (
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${encodeURIComponent(origin)}` +
    `&destination=${encodeURIComponent(destination)}` +
    `&travelmode=driving`
  )
}

export function getSeasonDisplayLabel(seasons: LocalGuideSeason[]): string {
  if (seasons.length === 0) return 'Toute l\'année'
  if (seasons.length === 2) return 'Hiver et Été'
  return SEASON_LABELS[seasons[0]]
}

/** Sous-types d’activités (filtrés via tags du guide local). */
export type ActivityTypeFilter =
  | 'all'
  | 'randonnee'
  | 'velo'
  | 'enfants'
  | 'piscine'
  | 'aventure'

export const ACTIVITY_TYPE_OPTIONS: {
  value: Exclude<ActivityTypeFilter, 'all'>
  label: string
  icon: LucideIcon
  /** Tags qui matchent ce type (au moins un). */
  matchTags: string[]
}[] = [
  {
    value: 'randonnee',
    label: 'Randonnées',
    icon: Footprints,
    matchTags: ['randonnee'],
  },
  {
    value: 'velo',
    label: 'Vélo / VTT',
    icon: Bike,
    matchTags: ['velo', 'vtt', 'bike-park', 'vae', 'xc'],
  },
  {
    value: 'enfants',
    label: 'Enfants',
    icon: Baby,
    matchTags: ['enfants', 'club', 'garderie', 'sportkids'],
  },
  {
    value: 'piscine',
    label: 'Piscines',
    icon: Waves,
    matchTags: ['piscine', 'aquatique'],
  },
  {
    value: 'aventure',
    label: 'Aventure',
    icon: MountainSnow,
    matchTags: ['accrobranche', 'via-ferrata', 'aventure'],
  },
]

export function entryMatchesActivityType(
  tags: string[],
  activityType: ActivityTypeFilter
): boolean {
  if (activityType === 'all') return true
  const option = ACTIVITY_TYPE_OPTIONS.find((o) => o.value === activityType)
  if (!option) return true
  const normalized = tags.map((t) => t.toLowerCase().trim())
  return option.matchTags.some((tag) => normalized.includes(tag))
}
