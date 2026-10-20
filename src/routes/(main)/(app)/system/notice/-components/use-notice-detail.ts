import { useQuery } from '@tanstack/react-query'

import { getNotice, noticeKeys } from '@/lib/api/notice'

/** Shared detail query for the form, detail and view drawers. */
export function useNoticeDetail(id: string | number | null, enabled = true) {
  return useQuery({
    queryKey: noticeKeys.detail(id),
    queryFn: () => getNotice(id as string | number),
    enabled: enabled && id !== null,
    staleTime: 0
  })
}
