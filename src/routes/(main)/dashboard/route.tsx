import { createFileRoute, Outlet } from '@tanstack/react-router'

import { AppShell, loadAppShell } from '@/components/app-shell'
import { PageTransition } from '@/components/app-shell/page-transition'
import { requireAuth } from '@/lib/auth-guard'

export const Route = createFileRoute('/(main)/dashboard')({
  beforeLoad: requireAuth,
  loader: loadAppShell,
  component: DashboardLayout
})

function DashboardLayout() {
  return (
    <AppShell {...Route.useLoaderData()}>
      <PageTransition>
        <Outlet />
      </PageTransition>
    </AppShell>
  )
}
