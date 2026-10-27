'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface LocalGuideEntrySkeletonProps {
  count?: number
}

export function LocalGuideEntrySkeleton({ count = 6 }: LocalGuideEntrySkeletonProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full min-w-0">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader className="space-y-3">
            <div className="flex justify-between">
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              <div className="h-5 w-20 rounded-md bg-muted animate-pulse" />
            </div>
            <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="h-4 w-full rounded bg-muted animate-pulse" />
            <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
