'use client'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  CATEGORY_ORDER,
  CATEGORY_PLURAL,
  CATEGORY_ICON_MAP,
  TAB_ACTIVE_STYLES,
  SEASON_OPTIONS,
  ACTIVITY_TYPE_OPTIONS,
  type FilterCategory,
  type ActivityTypeFilter,
} from '@/lib/local-guide/constants'
import type { LocalGuideSeason } from '@/types'
import { LayoutGrid, List, Search } from 'lucide-react'

interface LocalGuideFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  filterCategory: FilterCategory
  onFilterCategoryChange: (value: FilterCategory) => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  activitySeason: LocalGuideSeason
  onActivitySeasonChange: (season: LocalGuideSeason) => void
  showSeasonToggle: boolean
  activityType: ActivityTypeFilter
  onActivityTypeChange: (type: ActivityTypeFilter) => void
  showActivityTypeFilter: boolean
}

const scrollStripClass =
  'flex flex-nowrap gap-2 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

export function LocalGuideFilters({
  search,
  onSearchChange,
  filterCategory,
  onFilterCategoryChange,
  viewMode,
  onViewModeChange,
  activitySeason,
  onActivitySeasonChange,
  showSeasonToggle,
  activityType,
  onActivityTypeChange,
  showActivityTypeFilter,
}: LocalGuideFiltersProps) {
  const tabs: { value: FilterCategory; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: 'Tous', icon: <LayoutGrid className="h-4 w-4" /> },
    ...CATEGORY_ORDER.map((value) => {
      const Icon = CATEGORY_ICON_MAP[value]
      return {
        value,
        label: CATEGORY_PLURAL[value],
        icon: <Icon className="h-4 w-4" />,
      }
    }),
  ]

  const typeChips: {
    value: ActivityTypeFilter
    label: string
    icon: React.ReactNode
  }[] = [
    { value: 'all', label: 'Tous types', icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    ...ACTIVITY_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => ({
      value,
      label,
      icon: <Icon className="h-3.5 w-3.5" />,
    })),
  ]

  const showActivityRefinements = showSeasonToggle || showActivityTypeFilter

  return (
    <div className="space-y-5 rounded-xl border border-border/80 bg-card/80 p-4 sm:p-5">
      <div className="flex items-stretch gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher un lieu, une activité..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 pl-9"
            aria-label="Recherche"
          />
        </div>

        <div
          className="flex h-10 shrink-0 rounded-md border border-border bg-background p-0.5"
          role="group"
          aria-label="Mode d'affichage"
        >
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            aria-label="Vue grille"
            aria-pressed={viewMode === 'grid'}
            title="Vue grille"
            className={cn(
              'inline-flex items-center justify-center rounded px-2.5 transition-colors active:scale-[0.98]',
              viewMode === 'grid'
                ? 'bg-primary text-primary-foreground'
                : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            aria-label="Vue liste"
            aria-pressed={viewMode === 'list'}
            title="Vue liste"
            className={cn(
              'inline-flex items-center justify-center rounded px-2.5 transition-colors active:scale-[0.98]',
              viewMode === 'list'
                ? 'bg-primary text-primary-foreground'
                : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <span
          id="guide-filter-category-label"
          className="block text-xs font-medium text-muted-foreground"
        >
          Catégorie
        </span>
        <div
          className={scrollStripClass}
          role="group"
          aria-labelledby="guide-filter-category-label"
        >
          {tabs.map((tab) => {
            const isActive = filterCategory === tab.value
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onFilterCategoryChange(tab.value)}
                aria-pressed={isActive}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3.5 py-2 text-sm font-medium transition-colors active:scale-[0.98]',
                  isActive
                    ? TAB_ACTIVE_STYLES[tab.value]
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {showActivityRefinements && (
        <div className="space-y-3 rounded-lg border border-guide-activite/25 bg-guide-activite/[0.07] p-3 sm:p-4">
          {showSeasonToggle && (
            <div className="flex flex-wrap items-center gap-3">
              <span
                id="guide-filter-season-label"
                className="text-xs font-medium text-muted-foreground"
              >
                Saison
              </span>
              <div
                className="flex rounded-md border border-border bg-background p-0.5"
                role="group"
                aria-labelledby="guide-filter-season-label"
              >
                {SEASON_OPTIONS.map(({ value, label, icon: Icon }) => {
                  const isActive = activitySeason === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => onActivitySeasonChange(value)}
                      aria-pressed={isActive}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors active:scale-[0.98]',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {showActivityTypeFilter && (
            <div className="space-y-2">
              <span
                id="guide-filter-type-label"
                className="block text-xs font-medium text-muted-foreground"
              >
                Type d&apos;activité
              </span>
              <div
                className={scrollStripClass}
                role="group"
                aria-labelledby="guide-filter-type-label"
              >
                {typeChips.map((chip) => {
                  const isActive = activityType === chip.value
                  return (
                    <button
                      key={chip.value}
                      type="button"
                      onClick={() => onActivityTypeChange(chip.value)}
                      aria-pressed={isActive}
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors active:scale-[0.98] sm:text-sm',
                        isActive
                          ? 'border-guide-activite bg-guide-activite text-white'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {chip.icon}
                      {chip.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
