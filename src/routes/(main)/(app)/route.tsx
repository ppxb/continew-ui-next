import { createFileRoute, Outlet } from '@tanstack/react-router'

import { AppShell, loadAppShell } from '@/components/app-shell'
import { requireAuth } from '@/lib/auth-guard'
import { NotFound } from '@/routes/-components/not-found'

export const Route = createFileRoute('/(main)/(app)')({
  beforeLoad: requireAuth,
  loader: loadAppShell,
  component: AppLayout,
  notFoundComponent: NotFound
})

function AppLayout() {
  return (
    <AppShell {...Route.useLoaderData()}>
      <Outlet />
    </AppShell>
  )
}
