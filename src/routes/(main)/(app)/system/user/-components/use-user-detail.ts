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
   * Treat the cached record as stale straight away, so switching `enabled` back on always refetches
   * instead of serving a record that has not aged out of `DEFAULT_STALE_TIME_MS` yet.
   */
  readonly alwaysRefetch?: boolean
}

/**
 * One user's record, shared by the detail, edit and role dialogs through a single query key.
 *
 * Callers pass `enabled: open` together with `alwaysRefetch`, which is the only thing that can
 * refresh the record: the shared client turns off `refetchOnMount`, `refetchOnWindowFocus` and
 * `refetchOnReconnect`, and every drawer stays mounted for the whole page, so a plain `useQuery`
 * would keep serving whatever it fetched the first time.
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
