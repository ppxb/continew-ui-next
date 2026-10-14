import { useQuery } from '@tanstack/react-query'

import { getUser } from '@/lib/api/user'

/**
 * How long a fetched record stays fresh.
 *
 * This window is what makes reopening the same user reuse the cache instead of going back to
 * the API, so it is the one knob that decides how often the drawer actually fetches.
 */
const DETAIL_STALE_TIME_MS = 60_000

/**
 * One user's record, shared by the detail and edit drawers through a single query key.
 *
 * `refetchOnMount` is deliberately left at its default. It is what turns a click on 详情 or
 * 修改 into a request once the cached record has aged past the window, which is the only time
 * fetching should happen. The other automatic triggers are off: with the defaults, regaining
 * window focus refetched the record behind the user's back, even while the drawer was closed.
 */
export function useUserDetail(userId: string | number | null) {
  return useQuery({
    queryKey: ['system', 'user', 'detail', userId],
    queryFn: () => {
      if (userId === null) {
        throw new Error('A user detail was requested without an id')
      }

      return getUser(userId)
    },
    enabled: userId !== null,
    staleTime: DETAIL_STALE_TIME_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  })
}
