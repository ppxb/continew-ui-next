// @vitest-environment jsdom

import { CancelledError, QueryObserver } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ensureMenuLoaded, MENU_QUERY_KEY, menuQueryOptions } from '@/hooks/use-menu'
import type * as AuthApi from '@/lib/api/auth'
import type { RouteResp } from '@/lib/api/types'
import { clearSession } from '@/lib/auth-session'
import { endSession } from '@/lib/end-session'
import { ApiError } from '@/lib/http'
import { getCachedMenu, setCachedMenu } from '@/lib/menu-cache'
import { DEFAULT_STALE_TIME_MS, queryClient } from '@/lib/query-client'

const requests = vi.hoisted(() => ({ getUserRoutes: vi.fn<(signal?: AbortSignal) => Promise<RouteResp[]>>() }))

vi.mock('@/lib/api/auth', async importOriginal => ({
  ...(await importOriginal<typeof AuthApi>()),
  getUserRoutes: requests.getUserRoutes
}))

const restoredRoutes: RouteResp[] = [
  {
    id: 1,
    parentId: 0,
    title: 'Restored menu',
    type: 2,
    path: '/restored',
    name: 'Restored',
    component: 'Restored'
  }
]
const freshRoutes: RouteResp[] = [
  {
    id: 2,
    parentId: 0,
    title: 'Fresh menu',
    type: 2,
    path: '/fresh',
    name: 'Fresh',
    component: 'Fresh'
  }
]
const startedAt = new Date('2026-11-17T08:00:00Z').getTime()

function deferredRoutes() {
  let resolve!: (routes: RouteResp[]) => void
  const promise = new Promise<RouteResp[]>(done => {
    resolve = done
  })
  return { promise, resolve }
}

async function waitForFreshMenu() {
  await vi.waitFor(() => {
    expect(queryClient.getQueryData(MENU_QUERY_KEY)).toEqual(freshRoutes)
    expect(queryClient.isFetching({ queryKey: MENU_QUERY_KEY })).toBe(0)
  })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(startedAt)
  queryClient.clear()
  queryClient.setQueryDefaults(MENU_QUERY_KEY, { retry: false })
  clearSession()
  requests.getUserRoutes.mockReset()
})

afterEach(async () => {
  await queryClient.cancelQueries()
  queryClient.clear()
  queryClient.setQueryDefaults(MENU_QUERY_KEY, {})
  clearSession()
  vi.useRealTimers()
})

describe('menu navigation cache', () => {
  it('waits for a missing menu, then reuses the real response across fresh navigations', async () => {
    const response = deferredRoutes()
    requests.getUserRoutes.mockReturnValue(response.promise)
    let settled = false
    const loading = ensureMenuLoaded().then(routes => {
      settled = true
      return routes
    })

    await Promise.resolve()
    expect(settled).toBe(false)
    expect(requests.getUserRoutes).toHaveBeenCalledTimes(1)
    expect(requests.getUserRoutes.mock.calls[0]?.[0]).toBeInstanceOf(AbortSignal)

    response.resolve(freshRoutes)
    expect(await loading).toEqual(freshRoutes)
    expect(getCachedMenu()).toEqual(freshRoutes)
    expect(await Promise.all([ensureMenuLoaded(), ensureMenuLoaded(), ensureMenuLoaded()])).toEqual([
      freshRoutes,
      freshRoutes,
      freshRoutes
    ])
    expect(requests.getUserRoutes).toHaveBeenCalledTimes(1)
  })

  it('prefers fresh memory over older persisted data without requesting routes', async () => {
    setCachedMenu(restoredRoutes)
    queryClient.setQueryData(MENU_QUERY_KEY, freshRoutes)

    expect(await ensureMenuLoaded()).toEqual(freshRoutes)
    expect(await ensureMenuLoaded()).toEqual(freshRoutes)
    expect(requests.getUserRoutes).not.toHaveBeenCalled()
  })

  it('returns restored storage immediately and shares one background revalidation', async () => {
    const response = deferredRoutes()
    setCachedMenu(restoredRoutes)
    requests.getUserRoutes.mockReturnValue(response.promise)

    expect(await ensureMenuLoaded()).toEqual(restoredRoutes)
    expect(await ensureMenuLoaded()).toEqual(restoredRoutes)
    expect(queryClient.getQueryData(MENU_QUERY_KEY)).toEqual(restoredRoutes)
    expect(queryClient.isFetching({ queryKey: MENU_QUERY_KEY })).toBe(1)
    expect(requests.getUserRoutes).toHaveBeenCalledTimes(1)

    response.resolve(freshRoutes)
    await waitForFreshMenu()
    expect(getCachedMenu()).toEqual(freshRoutes)
    expect(await ensureMenuLoaded()).toEqual(freshRoutes)
    expect(requests.getUserRoutes).toHaveBeenCalledTimes(1)
  })

  it('does not make persisted initial data fresh when a menu observer creates the query first', async () => {
    const response = deferredRoutes()
    setCachedMenu(restoredRoutes)
    requests.getUserRoutes.mockReturnValue(response.promise)
    const observer = new QueryObserver(queryClient, menuQueryOptions)
    const unsubscribe = observer.subscribe(() => {})

    try {
      expect(observer.getCurrentResult().data).toEqual(restoredRoutes)
      expect(requests.getUserRoutes).not.toHaveBeenCalled()
      expect(await ensureMenuLoaded()).toEqual(restoredRoutes)
      expect(requests.getUserRoutes).toHaveBeenCalledTimes(1)

      response.resolve(freshRoutes)
      await waitForFreshMenu()
      expect(observer.getCurrentResult().data).toEqual(freshRoutes)
      expect(await ensureMenuLoaded()).toEqual(freshRoutes)
      expect(requests.getUserRoutes).toHaveBeenCalledTimes(1)
    } finally {
      unsubscribe()
    }
  })

  it('revalidates once at the normal TTL without blocking stale navigation', async () => {
    const response = deferredRoutes()
    queryClient.setQueryData(MENU_QUERY_KEY, restoredRoutes)
    requests.getUserRoutes.mockReturnValue(response.promise)

    vi.setSystemTime(startedAt + DEFAULT_STALE_TIME_MS - 1)
    expect(await ensureMenuLoaded()).toEqual(restoredRoutes)
    expect(requests.getUserRoutes).not.toHaveBeenCalled()

    vi.setSystemTime(startedAt + DEFAULT_STALE_TIME_MS)
    expect(await ensureMenuLoaded()).toEqual(restoredRoutes)
    expect(await ensureMenuLoaded()).toEqual(restoredRoutes)
    expect(requests.getUserRoutes).toHaveBeenCalledTimes(1)

    response.resolve(freshRoutes)
    await waitForFreshMenu()
    expect(await ensureMenuLoaded()).toEqual(freshRoutes)
    expect(requests.getUserRoutes).toHaveBeenCalledTimes(1)
  })

  it('revalidates invalidated fresh data on navigation and reuses the refreshed result', async () => {
    const response = deferredRoutes()
    requests.getUserRoutes.mockResolvedValueOnce(restoredRoutes).mockReturnValueOnce(response.promise)
    expect(await ensureMenuLoaded()).toEqual(restoredRoutes)
    expect(await ensureMenuLoaded()).toEqual(restoredRoutes)
    expect(requests.getUserRoutes).toHaveBeenCalledTimes(1)

    await queryClient.invalidateQueries({ queryKey: MENU_QUERY_KEY })
    expect(requests.getUserRoutes).toHaveBeenCalledTimes(1)
    expect(await ensureMenuLoaded()).toEqual(restoredRoutes)
    expect(await ensureMenuLoaded()).toEqual(restoredRoutes)
    expect(requests.getUserRoutes).toHaveBeenCalledTimes(2)

    response.resolve(freshRoutes)
    await waitForFreshMenu()
    expect(await ensureMenuLoaded()).toEqual(freshRoutes)
    expect(await ensureMenuLoaded()).toEqual(freshRoutes)
    expect(requests.getUserRoutes).toHaveBeenCalledTimes(2)
  })

  it('preserves an empty fallback for API failures when no menu exists', async () => {
    requests.getUserRoutes.mockRejectedValue(new ApiError('Menu unavailable', { status: 503 }))

    expect(await ensureMenuLoaded()).toEqual([])
    expect(getCachedMenu()).toBeNull()
    expect(requests.getUserRoutes).toHaveBeenCalledTimes(1)
  })

  it('preserves an empty fallback for cancelled cold requests', async () => {
    requests.getUserRoutes.mockRejectedValue(new CancelledError())

    expect(await ensureMenuLoaded()).toEqual([])
    expect(getCachedMenu()).toBeNull()
  })

  it('propagates unexpected cold request errors', async () => {
    const error = new Error('Unexpected route decoding error')
    requests.getUserRoutes.mockRejectedValue(error)

    await expect(ensureMenuLoaded()).rejects.toBe(error)
    expect(getCachedMenu()).toBeNull()
  })

  it('cancels a restored-menu refresh and clears both caches when the session ends', async () => {
    let requestSignal: AbortSignal | undefined
    setCachedMenu(restoredRoutes)
    requests.getUserRoutes.mockImplementation(signal => {
      requestSignal = signal
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
      })
    })
    expect(await ensureMenuLoaded()).toEqual(restoredRoutes)
    expect(queryClient.isFetching({ queryKey: MENU_QUERY_KEY })).toBe(1)
    const resetTabs = vi.fn()
    const navigate = vi.fn().mockResolvedValue(undefined)

    await endSession({ clearAuthSession: clearSession, queryClient, resetTabs, navigate })

    expect(requestSignal?.aborted).toBe(true)
    expect(queryClient.getQueryData(MENU_QUERY_KEY)).toBeUndefined()
    expect(getCachedMenu()).toBeNull()
  })
})
