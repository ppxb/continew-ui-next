import { skipToken, useQuery } from '@tanstack/react-query'

import { getPackage, packageKeys } from '@/lib/api/package'
import { DETAIL_STALE_TIME_MS } from '@/lib/query-client'

interface PackageDetailOptions {
  /** Whether the caller is showing the record; closed drawers stay idle. */
  readonly enabled?: boolean
  /** Force a fresh read when the edit drawer opens. */
  readonly refreshOnOpen?: boolean
}

/**
 * One package's record, shared by the detail and edit drawers through one key. Read-only detail
 * uses the short cache; the edit drawer refreshes before initializing its form.
 */
export function usePackageDetail(
  packageId: string | number | null,
  { enabled = true, refreshOnOpen = false }: PackageDetailOptions = {}
) {
  return useQuery({
    queryKey: packageKeys.detail(packageId),
    queryFn: packageId === null ? skipToken : ({ signal }) => getPackage(packageId, signal),
    enabled,
    staleTime: refreshOnOpen ? 0 : DETAIL_STALE_TIME_MS
  })
}
