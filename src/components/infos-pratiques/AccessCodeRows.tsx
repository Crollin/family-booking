'use client'

import { CopyValueButton } from '@/components/infos-pratiques/CopyValueButton'
import { FormattedAccessText } from '@/components/infos-pratiques/FormattedAccessText'
import { parseAccessInfoRows } from '@/lib/access-info-format'
import { cn } from '@/lib/utils'

type AccessCodeRowsProps = {
  content: string
  className?: string
}

export function AccessCodeRows({ content, className }: AccessCodeRowsProps) {
  const rows = parseAccessInfoRows(content)

  if (rows.length === 0) {
    return <p className="text-sm italic text-muted-foreground">Aucune information d&apos;accès</p>
  }

  const codeRows = rows.filter((row) => row.codes.length > 0)
  const notes = rows.filter((row) => row.codes.length === 0)

  return (
    <div className={cn('space-y-3', className)}>
      {codeRows.length > 0 ? (
        <ul className="space-y-2">
          {codeRows.map((row, index) => (
            <li
              key={`${row.raw}-${index}`}
              className="rounded-lg border border-border/70 bg-muted/15 px-3 py-2.5"
            >
              <p className="mb-2 text-xs font-medium text-muted-foreground">{row.label}</p>
              <div className="flex flex-wrap gap-2">
                {row.codes.map((code) => (
                  <div
                    key={code}
                    className="flex min-w-[8.5rem] flex-1 items-center justify-between gap-2 rounded-md border border-primary/20 bg-background px-3 py-2"
                  >
                    <span className="font-mono text-xl font-semibold tabular-nums tracking-[0.12em] text-primary">
                      {code}
                    </span>
                    <CopyValueButton
                      value={code}
                      label="Copier"
                      className="h-8 shrink-0 px-2 text-xs"
                    />
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {notes.length > 0 ? (
        <ul className="space-y-2 border-t border-border/50 pt-2.5">
          {notes.map((row, index) => (
            <li
              key={`${row.raw}-${index}`}
              className="border-l-2 border-border/80 pl-3 text-sm leading-snug text-muted-foreground"
            >
              <FormattedAccessText text={row.raw} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
