import { skipToken, useQuery } from '@tanstack/react-query'

import { getNotice, noticeKeys } from '@/lib/api/notice'
import { DETAIL_STALE_TIME_MS } from '@/lib/query-client'

interface NoticeDetailOptions {
  /** Whether the caller is showing the record; closed drawers stay idle. */
  readonly enabled?: boolean
  /** Force a fresh read before initializing the edit form. */
  readonly refreshOnOpen?: boolean
}

/** One notice's record shared by the form, detail and view drawers; a null id skips the query. */
export function useNoticeDetail(
  noticeId: string | number | null,
  { enabled = true, refreshOnOpen = false }: NoticeDetailOptions = {}
) {
  return useQuery({
    queryKey: noticeKeys.detail(noticeId),
    queryFn: noticeId === null ? skipToken : ({ signal }) => getNotice(noticeId, signal),
    enabled,
    staleTime: refreshOnOpen ? 0 : DETAIL_STALE_TIME_MS
  })
}
