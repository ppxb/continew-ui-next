import { skipToken, useQuery } from '@tanstack/react-query'

import { getUser, userKeys } from '@/lib/api/user'

interface UserDetailOptions {
  /**
   * Whether the caller is showing the record. Every open refetches it; nothing else does.
   */
  readonly enabled?: boolean
}

/**
 * One user's record, shared by the detail, edit and role dialogs through a single query key.
 *
 * `enabled: open` plus `staleTime: 0` is what makes each open fetch again: the drawers stay mounted
 * for the whole page, so flipping `enabled` goes through `shouldFetchOptionally`, which only checks
 * staleness. `refetchOnMount` cannot stand in for it, and the client keeps the mount, focus and
 * reconnect refetches off on purpose, so switching pages or windows never issues a request.
 *
 * A null id means no record is selected yet, which covers a create and a closed dialog. `skipToken`
 * keeps the query idle, so the fetch function never has to guard against a null id.
 */
export function useUserDetail(userId: string | number | null, { enabled = true }: UserDetailOptions = {}) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: userId === null ? skipToken : () => getUser(userId),
    enabled,
    // Stale straight away, so every open refetches. Deliberately overrides the client's one-minute
    // default: a drawer about to edit the record needs the current one, not a cached one.
    staleTime: 0
  })
}
