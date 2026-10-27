'use client'

import { Badge } from '@/components/ui/badge'
import type { LocalGuideEntry } from '@/types'
import {
  CATEGORY_LABELS,
  CATEGORY_CARD_STYLES,
  CATEGORY_ICON_MAP,
  NOT_PROVIDED,
} from '@/lib/local-guide/constants'
import { ChevronRight } from 'lucide-react'

interface LocalGuideEntryListItemProps {
  entry: LocalGuideEntry
  onSelect: (entry: LocalGuideEntry) => void
}

export function LocalGuideEntryListItem({ entry, onSelect }: LocalGuideEntryListItemProps) {
  const styles = CATEGORY_CARD_STYLES[entry.category]
  const Icon = CATEGORY_ICON_MAP[entry.category]

  return (
    <li>
      <button
        type="button"
        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset border-l-4 ${styles.border}`}
        onClick={() => onSelect(entry)}
      >
        <div className={`shrink-0 rounded-full p-2 ${styles.iconBg} ${styles.iconText}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{entry.name}</span>
            <Badge className={`shrink-0 ${styles.badge}`}>
              {CATEGORY_LABELS[entry.category]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
            {entry.address ?? entry.description ?? NOT_PROVIDED}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
    </li>
  )
}
