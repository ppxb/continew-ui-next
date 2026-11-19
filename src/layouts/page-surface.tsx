import type { ReactNode } from 'react'

import { useRouterState } from '@tanstack/react-router'

import { Spinner } from '@/components/ui/spinner'

/**
 * Route content wrapper. It is keyed on the pathname (and the refresh counter) by the layout,
 * so every navigation remounts it and replays the CSS entrance animation from
 * `data-transition` on the parent; the shell around it never re-animates.
 */
export function PageSurface({ showLoading, children }: { showLoading: boolean; children: ReactNode }) {
  // Subscribed here, not in the layout, so a pending navigation re-renders only this surface.
  const loading = useRouterState({ select: state => showLoading && state.status === 'pending' })

  return (
    <div data-slot="page-surface" className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col">
      {children}
      {loading && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center pt-24 motion-safe:animate-in motion-safe:delay-150 motion-safe:fill-mode-backwards motion-safe:fade-in"
        >
          <Spinner className="size-5 text-primary" />
        </div>
      )}
    </div>
  )
}
