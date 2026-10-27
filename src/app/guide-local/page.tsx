'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { apiGet } from '@/lib/api-client'
import type { LocalGuideEntry, LocalGuideCategory, LocalGuideSeason } from '@/types'
import { LocalGuideEntryDetailDialog } from '@/components/guide-local/LocalGuideEntryDetailDialog'
import { LocalGuideFilters } from '@/components/guide-local/LocalGuideFilters'
import { LocalGuideCategorySection } from '@/components/guide-local/LocalGuideCategorySection'
import { LocalGuideEntrySkeleton } from '@/components/guide-local/LocalGuideEntrySkeleton'
import { LocalGuideEmptyState } from '@/components/guide-local/LocalGuideEmptyState'
import {
  CATEGORY_ORDER,
  VIEW_STORAGE_KEY,
  SEASON_STORAGE_KEY,
  entryMatchesActivityType,
  type FilterCategory,
  type ActivityTypeFilter,
} from '@/lib/local-guide/constants'
import { activityMatchesSeason, detectCurrentSeason } from '@/lib/local-guide/season'
import { MapPin } from 'lucide-react'

export default function GuideLocalPage() {
  const { toast } = useToast()
  const [entries, setEntries] = useState<LocalGuideEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activitySeason, setActivitySeason] = useState<LocalGuideSeason>(() =>
    detectCurrentSeason()
  )
  const [activityType, setActivityType] = useState<ActivityTypeFilter>('all')
  const [detailEntry, setDetailEntry] = useState<LocalGuideEntry | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  useEffect(() => {
    const storedView = window.localStorage.getItem(VIEW_STORAGE_KEY)
    if (storedView === 'list' || storedView === 'grid') {
      setViewMode(storedView)
    }

    const storedSeason = window.localStorage.getItem(SEASON_STORAGE_KEY)
    if (storedSeason === 'hiver' || storedSeason === 'ete') {
      setActivitySeason(storedSeason)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, viewMode)
  }, [viewMode])

  useEffect(() => {
    window.localStorage.setItem(SEASON_STORAGE_KEY, activitySeason)
  }, [activitySeason])

  const fetchEntries = useCallback(async () => {
    try {
      const response = await apiGet('/api/local-guide')
      if (response.ok) {
        const data = await response.json()
        setEntries(data)
      } else {
        throw new Error('Erreur lors du chargement')
      }
    } catch (error) {
      console.error('Erreur lors du chargement du guide local:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les points d\'intérêt',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const filteredEntries = useMemo(() => {
    let list = entries

    if (filterCategory !== 'all') {
      list = list.filter((e) => e.category === filterCategory)
    }

    list = list.filter((e) => activityMatchesSeason(e, activitySeason))

    if (activityType !== 'all') {
      list = list.filter(
        (e) =>
          e.category === 'activite' &&
          entryMatchesActivityType(e.tags, activityType)
      )
    }

    if (search.trim()) {
      const lower = search.toLowerCase().trim()
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(lower) ||
          (e.description ?? '').toLowerCase().includes(lower) ||
          e.tags.some((t) => t.toLowerCase().includes(lower))
      )
    }

    return list
  }, [entries, filterCategory, search, activitySeason, activityType])

  const groupedByCategory = useMemo(() => {
    const groups = new Map<LocalGuideCategory, LocalGuideEntry[]>()
    for (const category of CATEGORY_ORDER) {
      groups.set(category, [])
    }
    for (const entry of filteredEntries) {
      groups.get(entry.category)?.push(entry)
    }
    return groups
  }, [filteredEntries])

  const showSeasonToggle = filterCategory === 'all' || filterCategory === 'activite'
  const showActivityTypeFilter = showSeasonToggle

  const handleFilterCategoryChange = (value: FilterCategory) => {
    setFilterCategory(value)
    if (value !== 'all' && value !== 'activite') {
      setActivityType('all')
    }
  }

  const handleActivityTypeChange = (type: ActivityTypeFilter) => {
    setActivityType(type)
    if (type !== 'all') {
      setFilterCategory('activite')
    }
  }

  const activitiesEmptyForSeason =
    showSeasonToggle &&
    filteredEntries.filter((e) => e.category === 'activite').length === 0 &&
    entries.some(
      (e) =>
        e.category === 'activite' &&
        !activityMatchesSeason(e, activitySeason)
    )

  const handleSelectEntry = (entry: LocalGuideEntry) => {
    setDetailEntry(entry)
    setDetailOpen(true)
  }

  const hasResults = filteredEntries.length > 0

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 w-full min-w-0 max-w-full overflow-x-hidden">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MapPin className="h-8 w-8 text-primary" />
          Guide local
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Découvrez les meilleurs restaurants d&apos;altitude, activités et services autour de la propriété.
          Toutes les bonnes adresses sélectionnées par la famille.
        </p>
      </div>

      <LocalGuideFilters
        search={search}
        onSearchChange={setSearch}
        filterCategory={filterCategory}
        onFilterCategoryChange={handleFilterCategoryChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        activitySeason={activitySeason}
        onActivitySeasonChange={setActivitySeason}
        showSeasonToggle={showSeasonToggle}
        activityType={activityType}
        onActivityTypeChange={handleActivityTypeChange}
        showActivityTypeFilter={showActivityTypeFilter}
      />

      {isLoading ? (
        <LocalGuideEntrySkeleton />
      ) : !hasResults ? (
        <LocalGuideEmptyState
          hasSearch={!!search.trim()}
          filterCategory={filterCategory}
          activitySeason={activitySeason}
          activitiesEmptyForSeason={activitiesEmptyForSeason}
          activityTypeActive={activityType !== 'all'}
        />
      ) : filterCategory === 'all' ? (
        <div className="space-y-2">
          {CATEGORY_ORDER.map((category) => (
            <LocalGuideCategorySection
              key={category}
              category={category}
              entries={groupedByCategory.get(category) ?? []}
              viewMode={viewMode}
              onSelectEntry={handleSelectEntry}
            />
          ))}
        </div>
      ) : (
        <LocalGuideCategorySection
          category={filterCategory}
          entries={filteredEntries}
          viewMode={viewMode}
          onSelectEntry={handleSelectEntry}
          showHeader={false}
        />
      )}

      <LocalGuideEntryDetailDialog
        entry={detailEntry}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}
