import { skipToken, useQuery } from '@tanstack/react-query'

import { getUser, userKeys } from '@/lib/api/user'
import { DETAIL_STALE_TIME_MS } from '@/lib/query-client'

interface UserDetailOptions {
  /** Whether the caller is showing the record; closed drawers stay idle. */
  readonly enabled?: boolean
  /** Force a fresh read when an edit or role flow opens. */
  readonly refreshOnOpen?: boolean
}

/**
 * One user's record, shared by the detail, edit and role dialogs through a single query key.
 *
 * The drawer stays mounted, so `enabled: open` keeps it idle while closed. Read-only detail uses
 * the short cache; edit and role flows set `refreshOnOpen` so they never initialize from a stale
 * snapshot.
 *
 * A null id means no record is selected yet, which covers a create and a closed dialog. `skipToken`
 * keeps the query idle, so the fetch function never has to guard against a null id.
 */
export function useUserDetail(
  userId: string | number | null,
  { enabled = true, refreshOnOpen = false }: UserDetailOptions = {}
) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: userId === null ? skipToken : () => getUser(userId),
    enabled,
    staleTime: refreshOnOpen ? 0 : DETAIL_STALE_TIME_MS
  })
}
