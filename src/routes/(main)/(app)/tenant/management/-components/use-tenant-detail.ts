import { skipToken, useQuery } from '@tanstack/react-query'

import { getTenant, tenantKeys } from '@/lib/api/tenant'
import { DETAIL_STALE_TIME_MS } from '@/lib/query-client'

interface TenantDetailOptions {
  /** Whether the caller is showing the record; closed drawers stay idle. */
  readonly enabled?: boolean
  /** Force a fresh read when the edit form opens. */
  readonly refreshOnOpen?: boolean
}

/** One tenant's record shared by the detail drawer and the edit form; a null id skips the query. */
export function useTenantDetail(
  tenantId: string | number | null,
  { enabled = true, refreshOnOpen = false }: TenantDetailOptions = {}
) {
  return useQuery({
    queryKey: tenantKeys.detail(tenantId),
    queryFn: tenantId === null ? skipToken : ({ signal }) => getTenant(tenantId, signal),
    enabled,
    staleTime: refreshOnOpen ? 0 : DETAIL_STALE_TIME_MS
  })
}
