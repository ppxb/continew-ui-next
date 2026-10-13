import { createFileRoute, useRouterState } from '@tanstack/react-router'

import { Construction } from 'lucide-react'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useMenuRoutes } from '@/hooks/use-menu'
import { findMenuByPath } from '@/navigation/sidebar/menu'
import { NotFound } from '@/routes/-components/not-found'

/**
 * Placeholder for backend menu entries that have no page yet.
 *
 * A path that is not part of the menu falls through to the regular not-found screen,
 * so typos are not reported as "under construction".
 */
export const Route = createFileRoute('/(main)/(app)/$')({
  component: PlaceholderPage
})

function PlaceholderPage() {
  const pathname = useRouterState({ select: state => state.location.pathname })
  const { data } = useMenuRoutes()
  const entry = findMenuByPath(data ?? [], pathname)

  if (!entry) {
    return <NotFound />
  }

  return (
    <div className="flex h-full items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Construction className="size-8 text-muted-foreground" />
          <CardTitle>{entry.title}</CardTitle>
          <CardDescription>
            Under construction. This menu entry has no page yet, and the route {pathname} is where it will live.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
