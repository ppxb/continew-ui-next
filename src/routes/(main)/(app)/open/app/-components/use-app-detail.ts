import { useQuery } from '@tanstack/react-query'

import { appKeys, getApp } from '@/lib/api/app'

interface AppDetailOptions {
  /**
   * Keep the query inactive until the caller needs the record.
   */
  readonly enabled?: boolean
  /**
   * Treat the cached record as stale straight away.
   */
  readonly alwaysRefetch?: boolean
}

/**
 * One app's record, shared by the detail and edit dialogs through a single query key.
 */
export function useAppDetail(
  appId: string | number | null,
  { enabled = true, alwaysRefetch = false }: AppDetailOptions = {}
) {
  return useQuery({
    queryKey: appKeys.detail(appId),
    queryFn: () => {
      if (appId === null) {
        throw new Error('An app detail was requested without an id')
      }

      return getApp(appId)
    },
    enabled: enabled && appId !== null,
    staleTime: alwaysRefetch ? 0 : undefined
  })
}
