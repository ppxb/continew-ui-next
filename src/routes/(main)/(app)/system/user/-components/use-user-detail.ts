import { skipToken, useQuery } from '@tanstack/react-query'

import { getUser, userKeys } from '@/lib/api/user'
import { DETAIL_STALE_TIME_MS } from '@/lib/query-client'

interface UserDetailOptions {
  /** Whether the caller is showing the record; closed drawers stay idle. */
  readonly enabled?: boolean
  /** Force a fresh read when an edit or role flow opens. */
  readonly refreshOnOpen?: boolean
}

/** One user's record shared by the detail, edit and role flows; a null id skips the query. */
export function useUserDetail(
  userId: string | number | null,
  { enabled = true, refreshOnOpen = false }: UserDetailOptions = {}
) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: userId === null ? skipToken : ({ signal }) => getUser(userId, signal),
    enabled,
    staleTime: refreshOnOpen ? 0 : DETAIL_STALE_TIME_MS
  })
}
