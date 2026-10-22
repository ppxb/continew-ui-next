import type { ReactNode } from 'react'

import { cn } from 'cn'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'

type FullscreenControls = ReturnType<typeof useFullscreenTransition>

interface ListPageCardProps {
  readonly title: string
  readonly description: string
  /** Search and filter controls, on the left of the row above the table. */
  readonly filters?: ReactNode
  /** Toolbar actions, on the right of the same row. */
  readonly actions?: ReactNode
  readonly fullscreen: FullscreenControls
  readonly children: ReactNode
}

/**
 * The card every list screen shares: a plain title row, the filter and toolbar row above the
 * table, and the fullscreen spacer that keeps the page height stable while the table expands.
 */
export function ListPageCard({ title, description, filters, actions, fullscreen, children }: ListPageCardProps) {
  return (
    <Card className="pb-0">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-0">
        {fullscreen.isFullscreen ? (
          <div ref={fullscreen.spacerRef} style={{ height: fullscreen.reservedHeight }} />
        ) : null}

        <div
          ref={fullscreen.fullscreenRef}
          className={cn('flex flex-col gap-4', fullscreen.isFullscreen && 'bg-background')}
        >
          {filters || actions ? (
            <div className="flex flex-col gap-3 px-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">{filters}</div>
              {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
            </div>
          ) : null}

          {children}
        </div>
      </CardContent>
    </Card>
  )
}
