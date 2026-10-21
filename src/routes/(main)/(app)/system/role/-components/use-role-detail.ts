import { useQuery } from '@tanstack/react-query'

import { getRole, roleKeys } from '@/lib/api/role'
import { DETAIL_STALE_TIME_MS } from '@/lib/query-client'

interface RoleDetailOptions {
  /** Keep the query inactive until the caller needs the record, instead of as soon as it has an id. */
  readonly enabled?: boolean
  /** Force a fresh read before initializing an edit or permission form. */
  readonly refreshOnOpen?: boolean
}

/** One role's detailed record (including menuIds, deptIds, checkStrictly settings). */
export function useRoleDetail(
  roleId: string | number | null,
  { enabled = true, refreshOnOpen = false }: RoleDetailOptions = {}
) {
  return useQuery({
    queryKey: roleKeys.detail(roleId),
    queryFn: () => {
      if (roleId === null) {
        throw new Error('A role detail was requested without an id')
      }

      return getRole(roleId)
    },
    enabled: enabled && roleId !== null,
    staleTime: refreshOnOpen ? 0 : DETAIL_STALE_TIME_MS
  })
}
