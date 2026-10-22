import { useQuery } from '@tanstack/react-query'

import { appKeys, getApp } from '@/lib/api/app'
import { DETAIL_STALE_TIME_MS } from '@/lib/query-client'

interface AppDetailOptions {
  /** Keep the query inactive until the caller needs the record. */
  readonly enabled?: boolean
  /** Force a fresh read when the edit drawer opens. */
  readonly refreshOnOpen?: boolean
}

/** One app's record, shared by the detail and edit dialogs through a single query key. */
export function useAppDetail(
  appId: string | number | null,
  { enabled = true, refreshOnOpen = false }: AppDetailOptions = {}
) {
  return useQuery({
    queryKey: appKeys.detail(appId),
    queryFn: ({ signal }) => {
      if (appId === null) {
        throw new Error('An app detail was requested without an id')
      }

      return getApp(appId, signal)
    },
    enabled: enabled && appId !== null,
    staleTime: refreshOnOpen ? 0 : DETAIL_STALE_TIME_MS
  })
}
