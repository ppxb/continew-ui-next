/**
 * Session state for the HTTP layer.
 *
 * The access token and tenant id live here instead of in the React store so that
 * `src/lib/http.ts` can read and rotate them without importing a store. The
 * generation counter makes a late 401 from a previous session unable to clear the
 * session that replaced it.
 *
 * The refresh token is never stored on the client: the backend keeps it in an
 * HttpOnly cookie, so only the access token is persisted here.
 */
import { clearCachedMenu } from './menu-cache'

const ACCESS_TOKEN_KEY = 'continew.access-token'
const TENANT_ID_KEY = 'continew.tenant-id'

let accessToken: string | null = null
let tenantId: string | null = null
let authGeneration = 0

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStored(key: string, value: string | null, persist: boolean) {
  try {
    if (value === null) {
      window.localStorage.removeItem(key)
      window.sessionStorage.removeItem(key)
      return
    }

    const target = persist ? window.localStorage : window.sessionStorage
    const other = persist ? window.sessionStorage : window.localStorage
    target.setItem(key, value)
    other.removeItem(key)
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[auth-session] Failed to persist session value:', error)
    }
  }
}

/** Reads the persisted session into memory; call once while the app starts. */
export function hydrateSession() {
  accessToken = readStored(ACCESS_TOKEN_KEY)
  tenantId = readStored(TENANT_ID_KEY)
}

export function getAccessToken(): string | null {
  return accessToken
}

export function getTenantId(): string | null {
  return tenantId
}

/** Increments whenever the session is replaced or cleared. */
export function getAuthGeneration(): number {
  return authGeneration
}

export function setAccessToken(token: string) {
  accessToken = token
  writeStored(ACCESS_TOKEN_KEY, token, window.localStorage.getItem(ACCESS_TOKEN_KEY) !== null)
}

export function setTenantId(value: string | number | null) {
  tenantId = value === null || value === undefined ? null : String(value)
  writeStored(TENANT_ID_KEY, tenantId, window.localStorage.getItem(TENANT_ID_KEY) !== null)
}

/** Stores a freshly created session. `persist` keeps it across browser restarts. */
export function setSession(next: { accessToken: string; tenantId?: string | number | null; persist?: boolean }) {
  const persist = next.persist ?? true
  accessToken = next.accessToken
  tenantId = next.tenantId === null || next.tenantId === undefined ? null : String(next.tenantId)
  writeStored(ACCESS_TOKEN_KEY, accessToken, persist)
  writeStored(TENANT_ID_KEY, tenantId, persist)
}

/** Clears the session and invalidates in-flight requests from the old session. */
export function clearSession() {
  accessToken = null
  tenantId = null
  authGeneration += 1
  writeStored(ACCESS_TOKEN_KEY, null, true)
  writeStored(TENANT_ID_KEY, null, true)
  clearCachedMenu()
}
