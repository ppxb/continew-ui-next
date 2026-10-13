import { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'

import { getUserRoutes } from '@/lib/api/auth'
import { toMenuGroups } from '@/navigation/sidebar/menu'

/** The menu only changes when the signed-in user or its roles change. */
export const MENU_QUERY_KEY = ['auth', 'menu'] as const

export function useMenuRoutes() {
  return useQuery({
    queryKey: MENU_QUERY_KEY,
    queryFn: getUserRoutes,
    staleTime: Number.POSITIVE_INFINITY
  })
}

/** Sidebar groups built from the menu the backend allows this user to see. */
export function useMenuGroups() {
  const { data, isPending } = useMenuRoutes()

  return {
    groups: useMemo(() => toMenuGroups(data ?? []), [data]),
    isPending
  }
}
