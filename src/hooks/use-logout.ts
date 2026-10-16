import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { useAuthStore } from '@/stores/auth/auth-provider'
import { useTabsStore } from '@/stores/tabs'

interface EndSessionOptions {
  /**
   * Ask the backend to revoke the session as well. Turn it off when the backend has
   * already invalidated it, for example right after a password change.
   */
  revokeOnServer?: boolean
}

/** Clears the session, drops cached data and returns to the login page. */
export function useLogout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const logout = useAuthStore(state => state.logout)
  const clearLocalSession = useAuthStore(state => state.clearLocalSession)
  const resetTabs = useTabsStore(state => state.resetTabs)

  return async ({ revokeOnServer = true }: EndSessionOptions = {}) => {
    // 1. Cancel any active in-flight queries before teardown
    await queryClient.cancelQueries()

    // 2. Revoke session on backend and clear local tokens
    if (revokeOnServer) {
      await logout()
    } else {
      clearLocalSession()
    }

    // 3. Reset open tabs
    resetTabs()

    // 4. Navigate first so authenticated components unmount cleanly
    await navigate({ to: '/auth/login', replace: true })

    // 5. Clear query cache after components have unmounted (prevents refetching active queries)
    queryClient.clear()
  }
}
