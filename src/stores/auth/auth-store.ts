import { createStore } from 'zustand/vanilla'

import { getUserInfo, login as loginRequest, logout as logoutRequest } from '@/lib/api/auth'
import type { UserInfoResp } from '@/lib/api/types'
import { clearSession, getAccessToken, setSession } from '@/lib/auth-session'
import { encryptPassword } from '@/lib/crypto'

export type AuthStatus = 'anonymous' | 'authenticated'

export type LoginParams = {
  username: string
  password: string
  captcha?: string
  uuid?: string
  /** Keep the access token across browser restarts. */
  persist?: boolean
}

export type AuthState = {
  status: AuthStatus
  user: UserInfoResp | null
  permissions: string[]
  roles: string[]
  isLoadingUser: boolean
  login: (params: LoginParams) => Promise<void>
  logout: () => Promise<void>
  /** Drops the local session without calling the backend. */
  clearLocalSession: () => void
  loadUser: () => Promise<void>
}

export const createAuthStore = () => {
  // While a fetch is already in flight, later callers share that promise instead of firing a second
  // request. React's StrictMode runs the bootstrap effect twice in development, and an action that
  // is safe to call twice is the right place to absorb that.
  let loadPromise: Promise<void> | null = null

  return createStore<AuthState>()((set, get) => ({
    status: getAccessToken() ? 'authenticated' : 'anonymous',
    user: null,
    permissions: [],
    roles: [],
    isLoadingUser: false,

    login: async ({ username, password, captcha, uuid, persist }) => {
      const response = await loginRequest({
        clientId: import.meta.env.VITE_CLIENT_ID,
        authType: 'ACCOUNT',
        username,
        // The backend decrypts this with its RSA private key.
        password: encryptPassword(password),
        captcha,
        uuid
      })

      setSession({ accessToken: response.accessToken, tenantId: response.tenantId, persist })
      set({ status: 'authenticated' })
      await get().loadUser()
    },

    loadUser: () => {
      if (!getAccessToken()) {
        set({ status: 'anonymous', user: null, permissions: [], roles: [] })
        return Promise.resolve()
      }

      if (!loadPromise) {
        set({ isLoadingUser: true })

        loadPromise = getUserInfo()
          .then(user => {
            set({
              user,
              permissions: user.permissions ?? [],
              roles: user.roles ?? [],
              status: 'authenticated'
            })
          })
          .finally(() => {
            loadPromise = null
            set({ isLoadingUser: false })
          })
      }

      return loadPromise
    },

    clearLocalSession: () => {
      clearSession()
      set({ status: 'anonymous', user: null, permissions: [], roles: [] })
    },

    logout: async () => {
      try {
        // Runs before the local session is cleared so the backend can find it.
        await logoutRequest()
      } catch {
        // The local session is cleared either way.
      }

      get().clearLocalSession()
    }
  }))
}
