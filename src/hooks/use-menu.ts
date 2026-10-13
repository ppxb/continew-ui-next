import { useMemo } from 'react'

import { queryOptions, useQuery } from '@tanstack/react-query'

import { getUserRoutes } from '@/lib/api/auth'
import { ApiError } from '@/lib/http'
import { queryClient } from '@/lib/query-client'
import { STATIC_MENU_ITEMS, toMenuGroups } from '@/navigation/sidebar/menu'

/** The menu only changes when the signed-in user or its roles change. */
export const MENU_QUERY_KEY = ['auth', 'menu'] as const

/** `'static'` marks the menu as never stale, which is what the loader relies on. */
export const menuQueryOptions = queryOptions({
  queryKey: MENU_QUERY_KEY,
  queryFn: getUserRoutes,
  staleTime: 'static'
})

export function useMenuRoutes() {
  return useQuery(menuQueryOptions)
}

/**
 * Waits for the menu before the shell renders, so the sidebar is never painted with
 * the static entries only.
 *
 * `queryClient.query` returns the cached menu when it is present and only fetches when it
 * is missing, which is why the options above carry `staleTime: 'static'`.
 *
 * A failed request is not fatal: `/dashboard` stays reachable and the sidebar falls back
 * to the static entries. Any other error is a bug, so it is rethrown rather than
 * swallowed — a silent failure here brings the sidebar flash straight back.
 */
export async function ensureMenuLoaded() {
  try {
    await queryClient.query(menuQueryOptions)
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
