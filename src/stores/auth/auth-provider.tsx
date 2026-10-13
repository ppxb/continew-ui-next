import { createContext, use, useEffect, useRef, useState } from 'react'

import { useNavigate, useRouter } from '@tanstack/react-router'
import { type StoreApi, useStore } from 'zustand'

import { toast } from '@/components/ui/toast'
import { getAccessToken } from '@/lib/auth-session'
import { setForbiddenHandler, setSessionExpiredHandler } from '@/lib/http'

import { createAuthStore, type AuthState } from './auth-store'

const AuthStoreContext = createContext<StoreApi<AuthState> | null>(null)

export function AuthStoreProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => createAuthStore())
  const navigate = useNavigate()
  const router = useRouter()
  const passwordExpiryNotified = useRef(false)

  useEffect(() => {
    if (getAccessToken()) {
      void store.getState().loadUser()
    }
  }, [store])

  useEffect(() => {
    // The backend rejects every request except a few while the password is expired, so
    // the user is taken to the page where it can be changed.
    return store.subscribe(state => {
      if (!state.user?.pwdExpired || passwordExpiryNotified.current) {
        return
      }

      passwordExpiryNotified.current = true
      toast.add({ title: '密码已过期，请先修改密码。', type: 'warning' })
      void navigate({ to: '/profile', replace: true })
    })
  }, [navigate, store])

  useEffect(() => {
    // The HTTP layer calls this when the refresh token is gone too, so the UI has
    // to drop the session and send the user back to the login page.
    setSessionExpiredHandler(message => {
      store.setState({ status: 'anonymous', user: null, permissions: [], roles: [] })
      toast.add({ title: message, type: 'error' })
      void navigate({
        to: '/auth/login',
        search: { redirect: router.state.location.href },
        replace: true
      })
    })

    setForbiddenHandler(() => {
      if (router.state.location.pathname === '/unauthorized') {
        return
      }

      void navigate({ to: '/unauthorized', replace: true })
    })

    return () => {
      setSessionExpiredHandler(null)
      setForbiddenHandler(null)
    }
  }, [navigate, router, store])

  return <AuthStoreContext.Provider value={store}>{children}</AuthStoreContext.Provider>
}

export function useAuthStore<T>(selector: (state: AuthState) => T): T {
  const store = use(AuthStoreContext) as StoreApi<AuthState> | null
  if (!store) throw new Error('Missing AuthStoreProvider')
  return useStore(store, selector)
}
