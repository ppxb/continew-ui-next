import { skipToken, useQuery } from '@tanstack/react-query'

import { getLog, logKeys } from '@/lib/api/log'

interface LogDetailOptions {
  /** Whether the caller is showing the record. Every open refetches it; nothing else does. */
  readonly enabled?: boolean
}

/**
 * One log's full record.
 *
 * Follows `useUserDetail`: the drawer stays mounted for the whole page, so `enabled: open`
 * plus `staleTime: 0` is what makes each open fetch again, and `skipToken` keeps the query
 * idle while no record is selected.
 */
export function useLogDetail(logId: string | number | null, { enabled = true }: LogDetailOptions = {}) {
  return useQuery({
    queryKey: logKeys.detail(logId),
    queryFn: logId === null ? skipToken : () => getLog(logId),
    enabled,
    staleTime: 0
  })
}
