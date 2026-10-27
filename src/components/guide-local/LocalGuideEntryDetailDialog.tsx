'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { LocalGuideEntry } from '@/types'
import {
  CATEGORY_LABELS,
  CATEGORY_CARD_STYLES,
  CATEGORY_ICON_MAP,
  SEASON_LABELS,
  getMapsUrl,
  getDirectionsFromProperty,
} from '@/lib/local-guide/constants'
import {
  MapPinned,
  Route,
  Phone,
  Mail,
  ExternalLink,
  Snowflake,
  Sun,
  Navigation,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface LocalGuideEntryDetailDialogProps {
  entry: LocalGuideEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function websiteHref(website: string) {
  return website.startsWith('http') ? website : `https://${website}`
}

export function LocalGuideEntryDetailDialog({
  entry,
  open,
  onOpenChange,
}: LocalGuideEntryDetailDialogProps) {
  if (!entry) return null

  const styles = CATEGORY_CARD_STYLES[entry.category]
  const Icon = CATEGORY_ICON_MAP[entry.category]
  const hasPrimaryActions = Boolean(entry.phone || entry.address || entry.website)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:rounded-xl',
          'border-t-4',
          styles.border
        )}
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-5 p-6">
            <DialogHeader className="space-y-3 text-left">
              <div className="flex flex-wrap items-center gap-2 pr-8">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full',
                    styles.iconBg,
                    styles.iconText
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <Badge className={styles.badge}>
                  {CATEGORY_LABELS[entry.category]}
                </Badge>
                {entry.category === 'activite' && entry.seasons.length > 0
                  ? entry.seasons.map((season) => {
                      const SeasonIcon = season === 'hiver' ? Snowflake : Sun
                      return (
                        <Badge key={season} variant="outline" className="gap-1 font-normal">
                          <SeasonIcon className="h-3 w-3" />
                          {SEASON_LABELS[season]}
                        </Badge>
                      )
                    })
                  : null}
                {entry.category === 'activite' && entry.seasons.length === 0 ? (
                  <Badge variant="outline" className="font-normal">
                    Toute l&apos;année
                  </Badge>
                ) : null}
              </div>

              <DialogTitle className="text-2xl font-semibold tracking-tight leading-snug">
                {entry.name}
              </DialogTitle>

              {entry.description ? (
                <DialogDescription className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                  {entry.description}
                </DialogDescription>
              ) : (
                <DialogDescription className="sr-only">
                  Détails de {entry.name}
                </DialogDescription>
              )}
            </DialogHeader>

            {entry.imageUrl ? (
              <div className="h-28 overflow-hidden rounded-lg border border-border/60 sm:h-32">
                <img
                  src={entry.imageUrl}
                  alt={entry.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}

            {(entry.address || entry.accessInstructions || entry.phone || entry.email || entry.website) && (
              <div className="overflow-hidden rounded-lg border border-border/80 divide-y divide-border/80">
                {entry.address ? (
                  <a
                    href={getMapsUrl(entry.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-3 px-3.5 py-3 transition-colors hover:bg-muted/50 active:bg-muted/70"
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                        styles.iconBg,
                        styles.iconText
                      )}
                    >
                      <MapPinned className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium text-muted-foreground">
                        Adresse
                      </span>
                      <span className="block text-sm text-foreground break-words group-hover:text-primary">
                        {entry.address}
                      </span>
                    </span>
                    <Navigation className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </a>
                ) : null}

                {entry.accessInstructions ? (
                  <div className="flex items-start gap-3 px-3.5 py-3">
                    <span
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                        styles.iconBg,
                        styles.iconText
                      )}
                    >
                      <Route className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground">Accès</p>
                      <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                        {entry.accessInstructions}
                      </p>
                    </div>
                  </div>
                ) : null}

                {entry.phone ? (
                  <a
                    href={`tel:${entry.phone}`}
                    className="group flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-muted/50 active:bg-muted/70"
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                        styles.iconBg,
                        styles.iconText
                      )}
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium text-muted-foreground">
                        Téléphone
                      </span>
                      <span className="block text-sm text-foreground group-hover:text-primary">
                        {entry.phone}
                      </span>
                    </span>
                  </a>
                ) : null}

                {entry.email ? (
                  <a
                    href={`mailto:${entry.email}`}
                    className="group flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-muted/50 active:bg-muted/70"
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                        styles.iconBg,
                        styles.iconText
                      )}
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium text-muted-foreground">
                        E-mail
                      </span>
                      <span className="block truncate text-sm text-foreground group-hover:text-primary">
                        {entry.email}
                      </span>
                    </span>
                  </a>
                ) : null}

                {entry.website ? (
                  <a
                    href={websiteHref(entry.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-muted/50 active:bg-muted/70"
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                        styles.iconBg,
                        styles.iconText
                      )}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium text-muted-foreground">
                        Site web
                      </span>
                      <span className="block truncate text-sm text-foreground group-hover:text-primary">
                        {entry.website.replace(/^https?:\/\//, '')}
                      </span>
                    </span>
                  </a>
                ) : null}
              </div>
            )}

            {entry.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {entry.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs font-normal text-muted-foreground"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {hasPrimaryActions ? (
          <div className="shrink-0 flex flex-wrap gap-2 border-t border-border/80 bg-background/95 px-4 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
            {entry.phone ? (
              <Button asChild size="sm" className="flex-1 min-w-[7.5rem]">
                <a href={`tel:${entry.phone}`}>
                  <Phone className="mr-1.5 h-3.5 w-3.5" />
                  Appeler
                </a>
              </Button>
            ) : null}
            {entry.address ? (
              <Button asChild size="sm" variant="outline" className="flex-1 min-w-[7.5rem]">
                <a
                  href={getDirectionsFromProperty(entry.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Navigation className="mr-1.5 h-3.5 w-3.5" />
                  Itinéraire
                </a>
              </Button>
            ) : null}
            {entry.website ? (
              <Button asChild size="sm" variant="outline" className="flex-1 min-w-[7.5rem]">
                <a
                  href={websiteHref(entry.website)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Site web
                </a>
              </Button>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
