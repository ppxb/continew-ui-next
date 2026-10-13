import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { useAuthStore } from '@/stores/auth/auth-provider'

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

  return async ({ revokeOnServer = true }: EndSessionOptions = {}) => {
    if (revokeOnServer) {
      await logout()
    } else {
      clearLocalSession()
    }

    // The menu and any other server state belong to the session that just ended.
    queryClient.clear()
    await navigate({ to: '/auth/login', replace: true })
  }
}
