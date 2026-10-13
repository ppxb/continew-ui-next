import { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'

import { getUserRoutes } from '@/lib/api/auth'
import { STATIC_MENU_ITEMS, toMenuGroups } from '@/navigation/sidebar/menu'

/** The menu only changes when the signed-in user or its roles change. */
export const MENU_QUERY_KEY = ['auth', 'menu'] as const

export function useMenuRoutes() {
  return useQuery({
    queryKey: MENU_QUERY_KEY,
    queryFn: getUserRoutes,
    staleTime: Number.POSITIVE_INFINITY
  })
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
