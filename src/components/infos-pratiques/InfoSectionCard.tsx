import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type InfoSectionTone = 'default' | 'emphasis'

const TONE_STYLES: Record<
  InfoSectionTone,
  { shell: string; header: string; iconWrap: string }
> = {
  default: {
    shell: 'border-border/80',
    header: 'border-b border-border/60 bg-muted/20',
    iconWrap: 'bg-primary/10 text-primary',
  },
  emphasis: {
    shell: 'border-secondary/30',
    header: 'border-b border-secondary/20 bg-secondary/5',
    iconWrap: 'bg-secondary/15 text-secondary',
  },
}

type InfoSectionCardProps = {
  title: string
  subtitle?: string
  icon: ReactNode
  tone?: InfoSectionTone
  className?: string
  compact?: boolean
  children: ReactNode
}

export function InfoSectionCard({
  title,
  subtitle,
  icon,
  tone = 'default',
  className,
  compact = false,
  children,
}: InfoSectionCardProps) {
  const styles = TONE_STYLES[tone]

  return (
    <Card className={cn('h-full overflow-hidden', styles.shell, className)}>
      <CardContent className="flex h-full flex-col p-0">
        <div
          className={cn(
            'flex items-center gap-2.5',
            compact ? 'px-3.5 py-2.5' : 'px-4 py-3',
            styles.header
          )}
        >
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-md',
              compact ? 'h-8 w-8' : 'h-9 w-9',
              styles.iconWrap
            )}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
            {subtitle ? (
              <p className="text-[11px] leading-snug text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
        </div>
        <div className={cn('flex-1', compact ? 'space-y-2.5 p-3.5' : 'space-y-3 p-4')}>
          {children}
        </div>
      </CardContent>
    </Card>
  )
}

type InfoGroupProps = {
  id?: string
  title: string
  children: ReactNode
  className?: string
}

/** Titre de groupe pour structurer l'onglet Infos. */
export function InfoGroup({ id, title, children, className }: InfoGroupProps) {
  return (
    <section id={id} className={cn('scroll-mt-16 space-y-3', className)}>
      <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
      {children}
    </section>
  )
}
