'use client'

import type { LocalGuideEntry, LocalGuideCategory } from '@/types'
import {
  CATEGORY_PLURAL,
  CATEGORY_ICON_MAP,
  CATEGORY_CARD_STYLES,
} from '@/lib/local-guide/constants'
import { LocalGuideEntryCard } from '@/components/guide-local/LocalGuideEntryCard'
import { LocalGuideEntryListItem } from '@/components/guide-local/LocalGuideEntryListItem'

interface LocalGuideCategorySectionProps {
  category: LocalGuideCategory
  entries: LocalGuideEntry[]
  viewMode: 'grid' | 'list'
  onSelectEntry: (entry: LocalGuideEntry) => void
  showHeader?: boolean
}

export function LocalGuideCategorySection({
  category,
  entries,
  viewMode,
  onSelectEntry,
  showHeader = true,
}: LocalGuideCategorySectionProps) {
  if (entries.length === 0) return null

  const Icon = CATEGORY_ICON_MAP[category]
  const styles = CATEGORY_CARD_STYLES[category]

  return (
    <section className="border-t border-border pt-10 first:border-t-0 first:pt-0">
      {showHeader && (
        <div className="flex items-center gap-3 mb-6">
          <div className={`rounded-full p-2.5 ${styles.iconBg} ${styles.iconText}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{CATEGORY_PLURAL[category]}</h2>
            <p className="text-sm text-muted-foreground">
              {entries.length} {entries.length > 1 ? 'adresses' : 'adresse'}
            </p>
          </div>
        </div>
      )}

      {viewMode === 'list' ? (
        <ul className="flex flex-col rounded-lg border border-border divide-y divide-border">
          {entries.map((entry) => (
            <LocalGuideEntryListItem
              key={entry.id}
              entry={entry}
              onSelect={onSelectEntry}
            />
          ))}
        </ul>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full min-w-0">
          {entries.map((entry) => (
            <LocalGuideEntryCard
              key={entry.id}
              entry={entry}
              onSelect={onSelectEntry}
            />
          ))}
        </div>
      )}
    </section>
  )
}
