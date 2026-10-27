'use client'

import { useState } from 'react'
import { splitAccessCodes } from '@/lib/checklist-format'
import { cn } from '@/lib/utils'

type FormattedAccessTextProps = {
  text: string
  className?: string
  /** Permet de copier un code au clic */
  copyableCodes?: boolean
}

export function FormattedAccessText({
  text,
  className,
  copyableCodes = true,
}: FormattedAccessTextProps) {
  const segments = splitAccessCodes(text)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      window.setTimeout(() => setCopiedCode(null), 1400)
    } catch {
      setCopiedCode(null)
    }
  }

  return (
    <span className={cn('leading-relaxed', className)}>
      {segments.map((segment, index) =>
        segment.type === 'code' ? (
          copyableCodes ? (
            <button
              key={index}
              type="button"
              onClick={() => copyCode(segment.value)}
              title="Copier le code"
              className={cn(
                'mx-0.5 inline-flex items-center rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5',
                'font-mono text-[0.8125rem] font-semibold tabular-nums text-primary',
                'transition-colors hover:bg-primary/15 active:scale-[0.98]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
            >
              {copiedCode === segment.value ? 'Copié' : segment.value}
            </button>
          ) : (
            <span
              key={index}
              className="mx-0.5 inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-1.5 py-px font-mono text-[0.8125rem] font-semibold tabular-nums text-primary"
            >
              {segment.value}
            </span>
          )
        ) : (
          <span key={index}>{segment.value}</span>
        )
      )}
    </span>
  )
}
