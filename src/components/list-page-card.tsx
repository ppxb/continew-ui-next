import type { ReactNode } from 'react'

import { cn } from 'cn'

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'

type FullscreenControls = ReturnType<typeof useFullscreenTransition>

/** The responsive action slot shared by every list header that keeps controls up top. */
const ACTION_CLASS =
  'col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end'

interface ListPageCardProps {
  readonly title: string
  readonly description: string
  /**
   * Header controls. Screens that keep their filters and toolbar in the content (the user screen)
   * omit it; the header then has no divider and no action slot.
   */
  readonly actions?: ReactNode
  readonly fullscreen: FullscreenControls
  readonly children: ReactNode
}

/**
 * The card every list screen shares: title and description, an optional action slot, and the
 * fullscreen spacer that keeps the page height stable while the table expands.
 */
export function ListPageCard({ title, description, actions, fullscreen, children }: ListPageCardProps) {
  return (
    <Card className="pb-0">
      <CardHeader
        className={cn(
          actions && 'border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]'
        )}
      >
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {actions ? <CardAction className={ACTION_CLASS}>{actions}</CardAction> : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-0">
        {fullscreen.isFullscreen ? (
          <div ref={fullscreen.spacerRef} style={{ height: fullscreen.reservedHeight }} />
        ) : null}

        <div
          ref={fullscreen.fullscreenRef}
          className={cn('flex flex-col gap-4', fullscreen.isFullscreen && 'bg-background')}
        >
          {children}
        </div>
      </CardContent>
    </Card>
  )
}
