import { createFileRoute, Navigate, notFound, type RegisteredRouter } from '@tanstack/react-router'

import { Construction } from 'lucide-react'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ensureMenuLoaded, MENU_QUERY_KEY } from '@/hooks/use-menu'
import type { RouteResp } from '@/lib/api/types'
import { queryClient } from '@/lib/query-client'
import { findMenuByPath, toPathname } from '@/navigation/menu'

/**
 * Placeholder for backend menu entries that have no page yet.
 *
 * A path that is not part of the menu falls through to the regular not-found screen,
 * so typos are not reported as "under construction".
 */
export const Route = createFileRoute('/(main)/(app)/$')({
  loader: async ({ location }) => {
    await ensureMenuLoaded()
    const routes = queryClient.getQueryData<RouteResp[]>(MENU_QUERY_KEY) ?? []
    const entry = findMenuByPath(routes, location.pathname)

    if (!entry) {
      throw notFound()
    }

    return { entry, pathname: location.pathname }
  },
  component: PlaceholderPage
})

function PlaceholderPage() {
  const { entry, pathname } = Route.useLoaderData()

  // Directories point at the entry screen of their section, for example /system -> /system/user.
  // The type arguments are pinned for the same reason as in `nav-main.tsx`: a backend
  // redirect is a raw path, so it travels as `href`.
  if (entry.redirect && toPathname(entry.redirect) !== pathname) {
    return <Navigate<RegisteredRouter, string, string> href={entry.redirect} replace />
  }

  // The menu's component value is where the page belongs, for example
  // `system/user/index` -> src/routes/(main)/(app)/system/user/route.tsx.
  const component = entry.component && entry.component !== 'Layout' ? entry.component : undefined
  const pagePath = component ? `src/routes/(main)/(app)/${component.replace(/\/index$/, '')}/route.tsx` : undefined

  return (
    <div className="flex h-full items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Construction className="size-8 text-muted-foreground" />
          <CardTitle>{entry.title}</CardTitle>
          <CardDescription>
            Under construction. This menu entry has no page yet.
            {pagePath ? <> Add it at {pagePath}.</> : null}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
