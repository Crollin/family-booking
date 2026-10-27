import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/gi

export type ParsedRichInfoContent = {
  blocks: string[]
  links: { href: string; label: string }[]
}

export function parseRichInfoContent(content: string): ParsedRichInfoContent {
  const links: { href: string; label: string }[] = []
  const seen = new Set<string>()

  const withoutUrls = content.replace(URL_PATTERN, (rawUrl) => {
    const href = rawUrl.replace(/[.,;:!?)]+$/, '')
    if (!seen.has(href)) {
      seen.add(href)
      links.push({ href, label: linkLabel(href) })
    }
    return '\n'
  })

  const blocks = withoutUrls
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .flatMap(splitLongParagraph)

  return { blocks, links }
}

function splitLongParagraph(text: string): string[] {
  if (text.length < 120 || !/[.!?]\s+/.test(text)) {
    return [text]
  }

  const parts = text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)

  return parts.length > 1 ? parts : [text]
}

function linkLabel(href: string): string {
  try {
    const url = new URL(href)
    const host = url.hostname.replace(/^www\./, '')
    if (url.pathname && url.pathname !== '/') {
      const path = decodeURIComponent(url.pathname).replace(/\/$/, '')
      const shortPath = path.length > 28 ? `${path.slice(0, 28)}…` : path
      return `${host}${shortPath}`
    }
    return host
  } catch {
    return href
  }
}

type RichInfoContentProps = {
  content: string
  className?: string
  emptyLabel?: string
}

export function RichInfoContent({
  content,
  className,
  emptyLabel = 'Aucun contenu',
}: RichInfoContentProps) {
  const { blocks, links } = parseRichInfoContent(content)

  if (blocks.length === 0 && links.length === 0) {
    return <p className="text-sm italic text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <div className={cn('space-y-4', className)}>
      {blocks.length > 0 ? (
        <ul className="space-y-2">
          {blocks.map((block, index) => (
            <li
              key={index}
              className="border-l-2 border-border/80 pl-3 text-sm leading-snug text-foreground/90"
            >
              {block}
            </li>
          ))}
        </ul>
      ) : null}

      {links.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <Button key={link.href} asChild variant="outline" size="sm" className="max-w-full">
              <a href={link.href} target="_blank" rel="noopener noreferrer" className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{link.label}</span>
              </a>
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
