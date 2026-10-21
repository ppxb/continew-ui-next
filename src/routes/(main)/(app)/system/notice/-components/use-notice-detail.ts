import { useQuery } from '@tanstack/react-query'

import { getNotice, noticeKeys } from '@/lib/api/notice'
import { DETAIL_STALE_TIME_MS } from '@/lib/query-client'

interface NoticeDetailOptions {
  readonly enabled?: boolean
  /** Force a fresh read before initializing the edit form. */
  readonly refreshOnOpen?: boolean
}

/** Shared detail query for the form, detail and view drawers. */
export function useNoticeDetail(
  id: string | number | null,
  { enabled = true, refreshOnOpen = false }: NoticeDetailOptions = {}
) {
  return useQuery({
    queryKey: noticeKeys.detail(id),
    queryFn: () => getNotice(id as string | number),
    enabled: enabled && id !== null,
    staleTime: refreshOnOpen ? 0 : DETAIL_STALE_TIME_MS
  })
}
