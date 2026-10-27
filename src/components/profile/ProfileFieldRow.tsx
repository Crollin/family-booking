import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

type ProfileFieldRowProps = {
  label: string
  children: React.ReactNode
  className?: string
}

export function ProfileFieldRow({ label, children, className }: ProfileFieldRowProps) {
  return (
    <div
      className={cn(
        'grid gap-3 rounded-lg border bg-muted/15 px-4 py-3 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:items-start sm:gap-4',
        className
      )}
    >
      <Label className="pt-0.5 text-xs font-medium text-muted-foreground sm:text-sm">{label}</Label>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
