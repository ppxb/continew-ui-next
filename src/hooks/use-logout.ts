import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { endSession } from '@/lib/end-session'
import { useAuthStore } from '@/stores/auth/auth-provider'
import { useTabsStore } from '@/stores/tabs'

interface LogoutOptions {
  revokeOnServer?: boolean
}

export function useLogout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const logout = useAuthStore(state => state.logout)
  const clearLocalSession = useAuthStore(state => state.clearLocalSession)
  const resetTabs = useTabsStore(state => state.resetTabs)

  return ({ revokeOnServer = true }: LogoutOptions = {}) =>
    endSession({
      clearAuthSession: revokeOnServer ? logout : clearLocalSession,
      queryClient,
      resetTabs,
      navigate
    })
}
