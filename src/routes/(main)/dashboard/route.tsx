import { createFileRoute, Outlet } from '@tanstack/react-router'

import { AppShell, readShellPreferences } from '@/components/app-shell'
import { requireAuth } from '@/lib/auth-guard'

export const Route = createFileRoute('/(main)/dashboard')({
  beforeLoad: requireAuth,
  loader: readShellPreferences,
  component: DashboardLayout
})

function DashboardLayout() {
  return (
    <AppShell {...Route.useLoaderData()}>
      <Outlet />
    </AppShell>
  )
}
