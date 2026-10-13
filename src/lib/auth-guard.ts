import { redirect } from '@tanstack/react-router'

import { getAccessToken } from './auth-session'

/** Paths that stay reachable without a session. */
const PUBLIC_PATHS = ['/auth', '/unauthorized']

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`))
}

/**
 * Guard for protected layouts.
 *
 * `beforeLoad` runs outside React, so this reads the module-level session instead
 * of the store. The requested URL travels along so login can return to it.
 */
export function requireAuth({ location }: { location: { href: string; pathname: string } }) {
  if (isPublicPath(location.pathname) || getAccessToken()) {
    return
  }

  throw redirect({ to: '/auth/login', search: { redirect: location.href } })
}
