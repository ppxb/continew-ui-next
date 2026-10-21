import { createStore } from 'zustand/vanilla'

import { getUserInfo, login as loginRequest, logout as logoutRequest } from '@/lib/api/auth'
import type { UserInfoResp } from '@/lib/api/types'
import { clearSession, getAccessToken, getAuthGeneration, setSession } from '@/lib/auth-session'
import { encryptPassword } from '@/lib/crypto'

export type AuthStatus = 'anonymous' | 'authenticated'

export type LoginParams = {
  username: string
  password: string
  captcha?: string
  uuid?: string
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
  clearLocalSession: () => void
  loadUser: () => Promise<void>
}

type LoadState = {
  generation: number
  promise: Promise<void>
}

const anonymousState = (): Pick<AuthState, 'status' | 'user' | 'permissions' | 'roles'> => ({
  status: 'anonymous',
  user: null,
  permissions: [],
  roles: []
})

export const createAuthStore = () => {
  let loadState: LoadState | null = null
  let loadToken = 0

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
        password: encryptPassword(password),
        captcha,
        uuid
      })

      setSession({ accessToken: response.accessToken, tenantId: response.tenantId, persist })
      set({ status: 'authenticated', user: null, permissions: [], roles: [] })
      await get().loadUser()
    },

    loadUser: () => {
      if (!getAccessToken()) {
        loadToken += 1
        loadState = null
        set({ ...anonymousState(), isLoadingUser: false })
        return Promise.resolve()
      }

      const generation = getAuthGeneration()

      if (loadState?.generation === generation) {
        return loadState.promise
      }

      const requestToken = ++loadToken
      set({ isLoadingUser: true })

      const promise = getUserInfo()
        .then(user => {
          if (generation !== getAuthGeneration()) {
            return
          }

          set({
            user,
            permissions: user.permissions ?? [],
            roles: user.roles ?? [],
            status: 'authenticated'
          })
        })
        .finally(() => {
          if (requestToken !== loadToken) {
            return
          }

          loadState = null
          set({ isLoadingUser: false })
        })

      loadState = { generation, promise }
      return promise
    },

    clearLocalSession: () => {
      clearSession()
      loadToken += 1
      loadState = null
      set({ ...anonymousState(), isLoadingUser: false })
    },

    logout: async () => {
      await logoutRequest().catch(() => undefined)
      get().clearLocalSession()
    }
  }))
}
