'use client'

import { InfoSectionCard } from '@/components/infos-pratiques/InfoSectionCard'
import { formatRuleForDisplay } from '@/lib/rule-display'
import { AlertCircle } from 'lucide-react'

type ApartmentRulesCardProps = {
  rules: string[]
}

export function ApartmentRulesCard({ rules }: ApartmentRulesCardProps) {
  return (
    <InfoSectionCard
      title="Règles de l'appartement"
      subtitle="À respecter pendant le séjour"
      icon={<AlertCircle className="h-4 w-4" strokeWidth={1.5} />}
      tone="emphasis"
      compact
    >
      {rules.length > 0 ? (
        <ol className="divide-y divide-border/60">
          {rules.map((rule, index) => {
            const formatted = formatRuleForDisplay(rule)
            return (
              <li key={index} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-xs font-semibold text-secondary"
                  aria-hidden
                >
                  {index + 1}
                </span>
                <div className="min-w-0 space-y-1">
                  {formatted.headline ? (
                    <>
                      <p className="text-sm font-medium leading-snug text-foreground">
                        {formatted.headline}
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {formatted.body}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm leading-relaxed text-foreground/90">{formatted.body}</p>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="text-sm italic text-muted-foreground">
          Aucune règle définie pour le moment.
        </p>
      )}
    </InfoSectionCard>
  )
}
