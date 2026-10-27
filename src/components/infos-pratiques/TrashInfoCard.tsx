'use client'

import { InfoSectionCard } from '@/components/infos-pratiques/InfoSectionCard'
import { Trash2 } from 'lucide-react'

type TrashScheduleItem = {
  type: string
  days: string[]
}

type TrashInfoCardProps = {
  schedule: TrashScheduleItem[]
}

export function TrashInfoCard({ schedule }: TrashInfoCardProps) {
  return (
    <InfoSectionCard
      title="Poubelles"
      subtitle="Collecte"
      icon={<Trash2 className="h-4 w-4" strokeWidth={1.5} />}
      compact
    >
      {schedule.length > 0 ? (
        <ul className="space-y-1.5">
          {schedule.map((item, index) => (
            <li
              key={`${item.type}-${index}`}
              className="rounded-md border border-border/70 bg-muted/15 px-3 py-2"
            >
              <p className="text-[11px] font-medium text-muted-foreground">{item.type}</p>
              <p className="text-sm font-medium text-foreground">{item.days.join(', ')}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm italic text-muted-foreground">Aucun horaire renseigné</p>
      )}
    </InfoSectionCard>
  )
}
