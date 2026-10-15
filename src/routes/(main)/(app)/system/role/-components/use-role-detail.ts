import { useQuery } from '@tanstack/react-query'

import { getRole, roleKeys } from '@/lib/api/role'

interface RoleDetailOptions {
  /**
   * Keep the query inactive until the caller needs the record, instead of as soon as it has an id.
   */
  readonly enabled?: boolean
  /**
   * Treat the cached record as stale straight away, so switching `enabled` back on always refetches.
   */
  readonly alwaysRefetch?: boolean
}

/**
 * One role's detailed record (including menuIds, deptIds, checkStrictly settings).
 */
export function useRoleDetail(
  roleId: string | number | null,
  { enabled = true, alwaysRefetch = false }: RoleDetailOptions = {}
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
    staleTime: alwaysRefetch ? 0 : undefined
  })
}
