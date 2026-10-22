import { skipToken, useQuery } from '@tanstack/react-query'

import { getTenant, tenantKeys } from '@/lib/api/tenant'
import { DETAIL_STALE_TIME_MS } from '@/lib/query-client'

interface TenantDetailOptions {
  /** Whether the caller is showing the record; closed drawers stay idle. */
  readonly enabled?: boolean
  /** Force a fresh read when an edit or password flow opens. */
  readonly refreshOnOpen?: boolean
}

/**
 * One tenant's record, shared by the detail, edit and password dialogs through one key.
 *
 * `enabled: open` keeps the query idle while closed; read-only detail uses the short cache, while
 * edit flows set `refreshOnOpen` before initializing their forms.
 */
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
