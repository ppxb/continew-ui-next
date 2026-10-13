import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { useAuthStore } from '@/stores/auth/auth-provider'

/** Clears the session on the server, drops cached data and returns to the login page. */
export function useLogout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const logout = useAuthStore(state => state.logout)

  return async () => {
    await logout()
    // The menu and any other server state belong to the session that just ended.
    queryClient.clear()
    await navigate({ to: '/auth/login', replace: true })
  }
}
