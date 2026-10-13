import { useMemo } from 'react'

import { queryOptions, useQuery } from '@tanstack/react-query'

import { getUserRoutes } from '@/lib/api/auth'
import { ApiError } from '@/lib/http'
import { getCachedMenu, setCachedMenu } from '@/lib/menu-cache'
import { queryClient } from '@/lib/query-client'
import { STATIC_MENU_ITEMS, toMenuGroups } from '@/navigation/sidebar/menu'

/** The menu only changes when the signed-in user or its roles change. */
export const MENU_QUERY_KEY = ['auth', 'menu'] as const

export const menuQueryOptions = queryOptions({
  queryKey: MENU_QUERY_KEY,
  queryFn: async () => {
    const routes = await getUserRoutes()
    setCachedMenu(routes)
    return routes
  },
  initialData: () => getCachedMenu() ?? undefined,
  staleTime: 1000 * 60 * 5
})

export function useMenuRoutes() {
  return useQuery(menuQueryOptions)
}

/**
 * Ensures menu data is present before the shell renders.
 *
 * If cached menu data already exists (from memory or localStorage), this resolves
 * immediately (0ms) so the shell mounts without delay. In the background, it
 * triggers a revalidation to keep data fresh without holding up the UI.
 *
 * Only when there is no cached data at all (first login/cold start) will it await
 * the network request to prevent flashing empty static menus.
 */
export async function ensureMenuLoaded() {
  const cached = queryClient.getQueryData(MENU_QUERY_KEY) ?? getCachedMenu()
  if (cached) {
    if (!queryClient.getQueryData(MENU_QUERY_KEY)) {
      queryClient.setQueryData(MENU_QUERY_KEY, cached)
    }
    // Replaces deprecated prefetchQuery with queryClient.query(...).catch(...)
    void queryClient.query({ ...menuQueryOptions, staleTime: 0 }).catch(() => {})
    return
  }

  // Replaces deprecated ensureQueryData with queryClient.query(..., staleTime: 'static')
  try {
    await queryClient.query({ ...menuQueryOptions, staleTime: 'static' })
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw error
    }
  }
}

/**
 * Sidebar groups: the app's own static routes first, then the menu the backend allows
 * this user to see. The static entries do not wait for the request, so `/dashboard`
 * stays reachable even when the menu call fails or the user has no roles.
 */
export function useMenuGroups() {
  const { data, isPending } = useMenuRoutes()

  return {
    groups: useMemo(() => toMenuGroups(data ?? [], STATIC_MENU_ITEMS), [data]),
    isPending
  }
}
