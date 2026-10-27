'use client'

import { Button } from '@/components/ui/button'
import { CopyValueButton } from '@/components/infos-pratiques/CopyValueButton'
import { InfoSectionCard } from '@/components/infos-pratiques/InfoSectionCard'
import {
  getMapsQueryFromAddressLines,
  parsePracticalAddress,
} from '@/lib/practical-info-format'
import { ExternalLink, MapPin, Navigation } from 'lucide-react'

type AddressInfoCardProps = {
  address: string | null
  /** Affiche seulement l'adresse postale (sans blocs Accès). */
  addressOnly?: boolean
}

export function AddressInfoCard({ address, addressOnly = false }: AddressInfoCardProps) {
  const { addressLines, sections } = parsePracticalAddress(address)
  const mapsQuery = getMapsQueryFromAddressLines(addressLines)
  const mapsUrl = mapsQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
    : null
  const fullAddressText = addressLines.join('\n')
  const showSections = !addressOnly && sections.length > 0

  return (
    <InfoSectionCard
      title="Adresse"
      subtitle="Résidence"
      icon={<MapPin className="h-4 w-4" strokeWidth={1.5} />}
      compact
    >
      {!address ? (
        <p className="text-sm italic text-muted-foreground">Aucune adresse renseignée</p>
      ) : (
        <div className="space-y-3">
          {addressLines.length > 0 ? (
            <>
              <address className="not-italic text-sm leading-snug text-foreground">
                {addressLines.map((line, index) => (
                  <p
                    key={index}
                    className={index === 0 ? 'font-semibold' : 'text-muted-foreground'}
                  >
                    {line}
                  </p>
                ))}
              </address>

              <div className="flex flex-wrap gap-2">
                {mapsUrl ? (
                  <Button asChild size="sm">
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                      <Navigation className="mr-1.5 h-3.5 w-3.5" />
                      Itinéraire
                      <ExternalLink className="ml-1.5 h-3 w-3 opacity-70" />
                    </a>
                  </Button>
                ) : null}
                <CopyValueButton value={fullAddressText} label="Copier" />
              </div>
            </>
          ) : null}

          {showSections ? (
            <p className="text-xs text-muted-foreground">
              Voir les accès ci-dessous
            </p>
          ) : null}

          {addressLines.length === 0 && sections.length === 0 ? (
            <p className="whitespace-pre-line text-sm text-muted-foreground">{address}</p>
          ) : null}
        </div>
      )}
    </InfoSectionCard>
  )
}
