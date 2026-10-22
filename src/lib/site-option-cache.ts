import type { LabelValueResp } from './api/common'

const SITE_OPTION_CACHE_KEY = 'continew.site-options'

/**
 * Returns the cached public site options from localStorage, or null if missing/corrupt.
 */
export function getCachedSiteOptions(): LabelValueResp<string>[] | null {
  try {
    const raw = window.localStorage.getItem(SITE_OPTION_CACHE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as LabelValueResp<string>[]) : null
  } catch {
    return null
  }
}

/**
 * Persists public site options to localStorage so the shell can render them on first paint.
 */
export function setCachedSiteOptions(options: LabelValueResp<string>[]): void {
  try {
    window.localStorage.setItem(SITE_OPTION_CACHE_KEY, JSON.stringify(options))
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[site-option-cache] Failed to persist site options:', error)
    }
  }
}
