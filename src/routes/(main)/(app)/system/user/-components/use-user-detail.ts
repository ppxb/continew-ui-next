import { skipToken, useQuery } from '@tanstack/react-query'

import { getUser, userKeys } from '@/lib/api/user'

interface UserDetailOptions {
  /**
   * Keep the query inactive until the caller needs the record, instead of as soon as it has an id.
   *
   * Switching this back on is what makes the query refetch. `refetchOnMount` cannot do that job
   * here, because every drawer stays mounted for the whole page, so it would only fire once.
   */
  readonly enabled?: boolean
}

/**
 * One user's record, shared by the detail, edit and role dialogs through a single query key.
 *
 * Callers pass `enabled: open`, and the `staleTime: 0` below is what turns that into a refetch: the
 * shared client turns off `refetchOnMount`, `refetchOnWindowFocus` and `refetchOnReconnect`, and
 * every drawer stays mounted for the whole page, so a plain `useQuery` would keep serving whatever
 * it fetched the first time.
 *
 * A null id means no record is selected yet, which covers a create and a closed dialog. `skipToken`
 * keeps the query idle, so the fetch function never has to guard against a null id.
 */
export function useUserDetail(userId: string | number | null, { enabled = true }: UserDetailOptions = {}) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: userId === null ? skipToken : () => getUser(userId),
    enabled,
    // Stale straight away, so switching `enabled` on always refetches. This deliberately overrides
    // the client's one-minute default: a drawer about to edit the record needs the current one, not
    // whatever the cache happens to hold.
    staleTime: 0
  })
}
