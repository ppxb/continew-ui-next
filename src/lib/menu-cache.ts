import type { RouteResp } from './api/types'

const MENU_CACHE_KEY = 'continew.menu-cache'

/**
 * Returns the cached menu routes from localStorage, or null if missing/corrupt.
 */
export function getCachedMenu(): RouteResp[] | null {
  try {
    const raw = window.localStorage.getItem(MENU_CACHE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as RouteResp[]) : null
  } catch {
    return null
  }
}

/**
 * Persists backend menu routes to localStorage.
 */
export function setCachedMenu(routes: RouteResp[]): void {
  try {
    window.localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(routes))
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[menu-cache] Failed to persist menu cache:', error)
    }
  }
}

/**
 * Removes cached menu routes from localStorage.
 */
export function clearCachedMenu(): void {
  try {
    window.localStorage.removeItem(MENU_CACHE_KEY)
  } catch {
    // Ignore storage errors during cleanup.
  }
}
