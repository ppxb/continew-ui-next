import { useNavigate } from '@tanstack/react-router'

import { useAuthStore } from '@/stores/auth/auth-provider'

/** Clears the session on the server and returns to the login page. */
export function useLogout() {
  const navigate = useNavigate()
  const logout = useAuthStore(state => state.logout)

  return async () => {
    await logout()
    await navigate({ to: '/auth/login', replace: true })
  }
}
