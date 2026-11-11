import { createFileRoute, Outlet } from '@tanstack/react-router'

import { AppShell, loadAppShell } from '@/components/app-shell'
import { PagePending } from '@/components/app-shell/page-pending'
import { QueryState } from '@/components/query-state'
import { requireAuth } from '@/lib/auth-guard'
import { NotFound } from '@/routes/-components/not-found'
import { useAuthStore } from '@/stores/auth/auth-provider'

export const Route = createFileRoute('/(main)/(app)')({
  beforeLoad: requireAuth,
  loader: loadAppShell,
  component: AppLayout,
  notFoundComponent: NotFound
})

function AppLayout() {
  return (
    <AppShell {...Route.useLoaderData()}>
      <AuthenticatedOutlet />
    </AppShell>
  )
}

/**
 * Holds the page back until the signed-in user's profile has settled.
 *
 * A restored token still starts with an empty permission set, so painting the page
 * earlier would draw permission-gated actions out of nothing and then move them once
 * `GET /auth/user/info` lands.
 */
function AuthenticatedOutlet() {
  const status = useAuthStore(state => state.status)
  const isLoadingUser = useAuthStore(state => state.isLoadingUser)
  const hasUser = useAuthStore(state => state.user !== null)
  const loadUser = useAuthStore(state => state.loadUser)

  // Signing out drops the profile before the redirect lands; keep the shell empty.
  if (status === 'anonymous') {
    return null
  }

  // A profile refresh (avatar, nickname) must not unmount the page that triggered it.
  if (hasUser) {
    return <Outlet />
  }

  if (isLoadingUser) {
    return <PagePending />
  }

  return (
    <QueryState
      state="error"
      title="用户信息加载失败"
      className="min-h-[calc(100dvh-8rem)]"
      onRetry={() => void loadUser()}
    />
  )
}
