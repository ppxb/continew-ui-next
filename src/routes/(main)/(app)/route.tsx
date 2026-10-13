import { createFileRoute, Outlet } from '@tanstack/react-router'

import { AppShell, loadAppShell } from '@/components/app-shell'
import { requireAuth } from '@/lib/auth-guard'

/**
 * Pathless layout for every screen that the backend menu links to.
 *
 * Its own paths are the backend menu paths (for example `/system/user`), so pages
 * are placed by the `component` value of the menu entry. The splat route next to it
 * renders the placeholder for menu entries that have no page yet.
 */
export const Route = createFileRoute('/(main)/(app)')({
  beforeLoad: requireAuth,
  loader: loadAppShell,
  component: AppLayout
})

function AppLayout() {
  return (
    <AppShell {...Route.useLoaderData()}>
      <Outlet />
    </AppShell>
  )
}
