import type { ReactNode } from 'react'

import { useRouterState } from '@tanstack/react-router'

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: state => state.location.pathname })

  return (
    <div
      key={pathname}
      className="motion-safe:animate-in motion-safe:duration-150 motion-safe:ease-out motion-safe:fade-in motion-safe:slide-in-from-bottom-1"
    >
      {children}
    </div>
  )
}
