'use client'

import { CopyValueButton } from '@/components/infos-pratiques/CopyValueButton'
import { InfoSectionCard } from '@/components/infos-pratiques/InfoSectionCard'
import { Wifi } from 'lucide-react'

type WifiInfoCardProps = {
  network: string | null
  password: string | null
}

export function WifiInfoCard({ network, password }: WifiInfoCardProps) {
  return (
    <InfoSectionCard
      title="WiFi"
      subtitle="Connexion"
      icon={<Wifi className="h-4 w-4" strokeWidth={1.5} />}
      compact
    >
      {!network ? (
        <p className="text-sm italic text-muted-foreground">
          Aucune information WiFi renseignée
        </p>
      ) : (
        <div className="space-y-2">
          <CredentialRow label="Réseau" value={network} />
          {password ? <CredentialRow label="Mot de passe" value={password} emphasize /> : null}
        </div>
      )}
    </InfoSectionCard>
  )
}

function CredentialRow({
  label,
  value,
  emphasize = false,
}: {
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <div
      className={
        emphasize
          ? 'rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5'
          : 'rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5'
      }
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <CopyValueButton value={value} label="Copier" className="h-7 px-2 text-xs" />
      </div>
      <p
        className={
          emphasize
            ? 'break-all font-mono text-xl font-semibold tracking-wide text-foreground'
            : 'break-all font-mono text-sm font-medium text-foreground'
        }
      >
        {value}
      </p>
    </div>
  )
}
