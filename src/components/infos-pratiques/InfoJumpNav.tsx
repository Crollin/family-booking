'use client'

import { cn } from '@/lib/utils'

const LINKS = [
  { href: '#essentiels', label: 'Essentiels' },
  { href: '#acces', label: 'Accès' },
  { href: '#sur-place', label: 'Sur place' },
  { href: '#regles', label: 'Règles' },
] as const

type InfoJumpNavProps = {
  className?: string
  showAccess?: boolean
}

export function InfoJumpNav({ className, showAccess = true }: InfoJumpNavProps) {
  const links = showAccess ? LINKS : LINKS.filter((link) => link.href !== '#acces')

  return (
    <nav
      aria-label="Sections des infos"
      className={cn(
        'sticky top-2 z-20 -mx-1 overflow-x-auto rounded-lg border border-border/70 bg-card/95 px-1 py-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80',
        className
      )}
    >
      <ul className="flex min-w-max gap-1">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
