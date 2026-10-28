import { skipToken, useQuery } from '@tanstack/react-query'

import { getRole, roleKeys } from '@/lib/api/role'
import { DETAIL_STALE_TIME_MS } from '@/lib/query-client'

interface RoleDetailOptions {
  /** Whether the caller is showing the record; closed drawers stay idle. */
  readonly enabled?: boolean
  /** Force a fresh read when an edit or permission flow opens. */
  readonly refreshOnOpen?: boolean
}

/** One role's detailed record (menuIds, deptIds and the two checkStrictly settings); a null id skips it. */
export function useRoleDetail(
  roleId: string | number | null,
  { enabled = true, refreshOnOpen = false }: RoleDetailOptions = {}
) {
  return useQuery({
    queryKey: roleKeys.detail(roleId),
    queryFn: roleId === null ? skipToken : ({ signal }) => getRole(roleId, signal),
    enabled,
    staleTime: refreshOnOpen ? 0 : DETAIL_STALE_TIME_MS
  })
}
