import { skipToken, useQuery } from '@tanstack/react-query'

import { getPackage, packageKeys } from '@/lib/api/package'

interface PackageDetailOptions {
  /** Whether the caller is showing the record. Every open refetches it; nothing else does. */
  readonly enabled?: boolean
}

/**
 * One package's record, shared by the detail and edit drawers through one key.
 *
 * Follows `useTenantDetail`: `enabled: open` plus `staleTime: 0` is what makes each open fetch
 * again, and `skipToken` keeps the query idle while no record is selected.
 */
export function usePackageDetail(packageId: string | number | null, { enabled = true }: PackageDetailOptions = {}) {
  return useQuery({
    queryKey: packageKeys.detail(packageId),
    queryFn: packageId === null ? skipToken : () => getPackage(packageId),
    enabled,
    staleTime: 0
  })
}
