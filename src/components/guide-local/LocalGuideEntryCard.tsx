'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { LocalGuideEntry } from '@/types'
import {
  CATEGORY_LABELS,
  CATEGORY_CARD_STYLES,
  CATEGORY_ICON_MAP,
  getDirectionsFromProperty,
} from '@/lib/local-guide/constants'
import {
  MapPinned,
  Phone,
  ChevronRight,
} from 'lucide-react'

interface LocalGuideEntryCardProps {
  entry: LocalGuideEntry
  onSelect: (entry: LocalGuideEntry) => void
}

export function LocalGuideEntryCard({ entry, onSelect }: LocalGuideEntryCardProps) {
  const styles = CATEGORY_CARD_STYLES[entry.category]
  const Icon = CATEGORY_ICON_MAP[entry.category]

  const handleOpen = () => onSelect(entry)

  return (
    <Card
      className={`flex flex-col h-full min-h-0 min-w-0 overflow-hidden cursor-pointer transition-all hover:shadow-md active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-ring border-t-2 ${styles.border}`}
      onClick={handleOpen}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleOpen()
        }
      }}
    >
      {entry.imageUrl ? (
        <div className="h-28 w-full min-w-0 overflow-hidden sm:h-32">
          <img
            src={entry.imageUrl}
            alt={entry.name}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      <CardHeader className="pb-2 px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className={`rounded-full p-2 ${styles.iconBg} ${styles.iconText}`}>
            <Icon className="h-4 w-4" />
          </div>
          <Badge className={`shrink-0 ${styles.badge}`}>
            {CATEGORY_LABELS[entry.category]}
          </Badge>
        </div>
        <h2 className="text-lg font-semibold mt-2 truncate">{entry.name}</h2>
      </CardHeader>

      <CardContent className="space-y-3 flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden pt-0 px-4 pb-4 sm:px-6 sm:pb-6">
        {entry.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {entry.description}
          </p>
        )}

        {(entry.address || entry.phone) && (
          <div className="space-y-2 text-sm min-w-0">
            {entry.address && (
              <div className="flex items-start gap-2 min-w-0">
                <MapPinned className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                <a
                  href={getDirectionsFromProperty(entry.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="hover:underline text-primary truncate min-w-0 break-words"
                >
                  {entry.address}
                </a>
              </div>
            )}
            {entry.phone && (
              <div className="flex items-center gap-2 min-w-0">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <a
                  href={`tel:${entry.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:underline"
                >
                  {entry.phone}
                </a>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2 mt-auto border-t border-border/50 min-w-0">
          <div className="flex flex-wrap gap-1 min-w-0 flex-1 items-center overflow-hidden">
            {entry.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs font-normal">
                {tag}
              </Badge>
            ))}
            {entry.tags.length > 3 && (
              <Badge variant="outline" className="text-xs font-normal">
                +{entry.tags.length - 3}
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 font-medium border-primary/40 text-primary hover:bg-primary/10 hover:border-primary hover:text-primary"
            onClick={(e) => {
              e.stopPropagation()
              handleOpen()
            }}
          >
            Voir plus
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
