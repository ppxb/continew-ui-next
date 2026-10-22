import { skipToken, useQuery } from '@tanstack/react-query'

import { getLog, logKeys } from '@/lib/api/log'
import { DETAIL_STALE_TIME_MS } from '@/lib/query-client'

interface LogDetailOptions {
  /** Whether the caller is showing the record; closed drawers stay idle. */
  readonly enabled?: boolean
  /** Force a fresh read when the drawer opens. */
  readonly refreshOnOpen?: boolean
}

/**
 * One log's full record. The drawer stays mounted, so `enabled: open` keeps it idle while closed;
 * read-only opens use the short detail cache.
 */
export function useLogDetail(
  logId: string | number | null,
  { enabled = true, refreshOnOpen = false }: LogDetailOptions = {}
) {
  return useQuery({
    queryKey: logKeys.detail(logId),
    queryFn: logId === null ? skipToken : ({ signal }) => getLog(logId, signal),
    enabled,
    staleTime: refreshOnOpen ? 0 : DETAIL_STALE_TIME_MS
  })
}
