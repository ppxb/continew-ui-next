import { skipToken, useQuery } from '@tanstack/react-query'

import { getTenant, tenantKeys } from '@/lib/api/tenant'

interface TenantDetailOptions {
  /** Whether the caller is showing the record. Every open refetches it; nothing else does. */
  readonly enabled?: boolean
}

/**
 * One tenant's record, shared by the detail, edit and password dialogs through one key.
 *
 * Follows `useUserDetail`: `enabled: open` plus `staleTime: 0` is what makes each open fetch
 * again, and `skipToken` keeps the query idle while no record is selected.
 */
export function useTenantDetail(tenantId: string | number | null, { enabled = true }: TenantDetailOptions = {}) {
  return useQuery({
    queryKey: tenantKeys.detail(tenantId),
    queryFn: tenantId === null ? skipToken : () => getTenant(tenantId),
    enabled,
    staleTime: 0
  })
}
