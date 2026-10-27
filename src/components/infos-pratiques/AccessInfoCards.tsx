'use client'

import { AccessCodeRows } from '@/components/infos-pratiques/AccessCodeRows'
import { InfoGroup, InfoSectionCard } from '@/components/infos-pratiques/InfoSectionCard'
import { parsePracticalAddress } from '@/lib/practical-info-format'
import { KeyRound } from 'lucide-react'

type AccessInfoCardsProps = {
  address: string | null
}

export function AccessInfoCards({ address }: AccessInfoCardsProps) {
  const { sections } = parsePracticalAddress(address)

  if (sections.length === 0) return null

  return (
    <InfoGroup id="acces" title="Accès à la résidence">
      <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
        {sections.map((section) => (
          <InfoSectionCard
            key={section.title}
            title={section.title}
            subtitle="Codes et consignes"
            icon={<KeyRound className="h-4 w-4" strokeWidth={1.5} />}
            compact
          >
            <AccessCodeRows content={section.content} />
          </InfoSectionCard>
        ))}
      </div>
    </InfoGroup>
  )
}
