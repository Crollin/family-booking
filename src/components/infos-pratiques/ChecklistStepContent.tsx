import { parseChecklistText } from '@/lib/checklist-format'
import { FormattedAccessText } from '@/components/infos-pratiques/FormattedAccessText'
import { cn } from '@/lib/utils'

type ChecklistStepContentProps = {
  text: string
  className?: string
}

export function ChecklistStepContent({ text, className }: ChecklistStepContentProps) {
  const { title, items } = parseChecklistText(text)

  if (items.length === 0) {
    return null
  }

  const hasList = items.length > 1 || title !== null

  return (
    <div className={cn('min-w-0 space-y-2', className)}>
      {title && (
        <p className="text-sm font-medium text-foreground">
          <FormattedAccessText text={title} />
        </p>
      )}

      {hasList ? (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex gap-2.5 text-sm text-muted-foreground">
              <span
                className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary/70"
                aria-hidden
              />
              <FormattedAccessText text={item} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          <FormattedAccessText text={items[0]} />
        </p>
      )}
    </div>
  )
}
