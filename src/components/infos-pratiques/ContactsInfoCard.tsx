'use client'

import { Button } from '@/components/ui/button'
import { InfoSectionCard } from '@/components/infos-pratiques/InfoSectionCard'
import { Phone } from 'lucide-react'

type Contact = {
  type: string
  label: string
  phone: string
}

type ContactsInfoCardProps = {
  contacts: Contact[]
}

export function ContactsInfoCard({ contacts }: ContactsInfoCardProps) {
  return (
    <InfoSectionCard
      title="Contacts"
      subtitle="Appel direct"
      icon={<Phone className="h-4 w-4" strokeWidth={1.5} />}
      compact
    >
      {contacts.length > 0 ? (
        <ul className="space-y-2">
          {contacts.map((contact, index) => {
            const telHref = `tel:${contact.phone.replace(/\s+/g, '')}`

            return (
              <li
                key={`${contact.label}-${index}`}
                className="rounded-lg border border-border/70 bg-muted/15 p-3"
              >
                <p className="text-[11px] font-medium text-muted-foreground">{contact.label}</p>
                <a
                  href={telHref}
                  className="mt-0.5 block font-mono text-lg font-semibold tabular-nums tracking-wide text-foreground hover:text-primary"
                >
                  {contact.phone}
                </a>
                <Button asChild size="sm" className="mt-2 h-8 w-full">
                  <a href={telHref}>
                    <Phone className="mr-1.5 h-3.5 w-3.5" />
                    Appeler
                  </a>
                </Button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-sm italic text-muted-foreground">Aucun contact renseigné</p>
      )}
    </InfoSectionCard>
  )
}
