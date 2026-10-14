import { useQuery } from '@tanstack/react-query'

import { getUser, userKeys } from '@/lib/api/user'

interface UserDetailOptions {
  /**
   * Keep the query inactive until the caller needs the record, instead of as soon as it has an id.
   *
   * Switching this back on is what makes the query refetch. `refetchOnMount` cannot do that job
   * here, because every drawer stays mounted for the whole page, so it would only fire once.
   */
  readonly enabled?: boolean
  /**
   * Treat the cached record as stale straight away, so switching `enabled` back on always refetches.
   *
   * The role dialog needs that: saving replaces the whole role set, so it must not seed its picker
   * from a record that merely has not aged out of `DETAIL_STALE_TIME_MS` yet.
   */
  readonly alwaysRefetch?: boolean
}

/**
 * One user's record, shared by the detail, edit and role dialogs through a single query key.
 *
 * `refetchOnMount` is deliberately left at its default. It is what turns a click on 详情 or
 * 修改 into a request once the cached record has aged past the window, which is the only time
 * fetching should happen. The other automatic triggers are off: with the defaults, regaining
 * window focus refetched the record behind the user's back, even while the drawer was closed.
 */
export function useUserDetail(
  userId: string | number | null,
  { enabled = true, alwaysRefetch = false }: UserDetailOptions = {}
) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => {
      if (userId === null) {
        throw new Error('A user detail was requested without an id')
      }

      return getUser(userId)
    },
    enabled: enabled && userId !== null,
    staleTime: alwaysRefetch ? 0 : undefined
  })
}
