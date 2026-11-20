import * as React from 'react'
import { Eye } from 'lucide-react'

import { EntityDrawer } from '@/components/entity-drawer'
import { QueryState } from '@/components/query-state'
import { ProDescriptions } from '@/components/pro'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserNoticeDetail } from '@/routes/(main)/(app)/user/message/-components/use-messages'

import { useNoticeDetail } from './use-notice-detail'
import { noticeColumns } from './notice-columns'
import { useNoticeDicts } from './use-notice-dicts'

interface NoticeViewDrawerProps {
  readonly noticeId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
  /**
   * `manage` reads `/system/notice/{id}` and needs the notice permission; `self` reads the
   * current user's copy, which any signed-in user may open and which marks it read.
   */
  readonly source?: 'manage' | 'self'
}

/** The reader view: title, publisher, publish time, then the body. */
export function NoticeViewDrawer({ noticeId, open, onClose, source = 'manage' }: NoticeViewDrawerProps) {
  const manageQuery = useNoticeDetail(source === 'manage' ? noticeId : null, { enabled: open })
  const selfQuery = useUserNoticeDetail(source === 'self' ? noticeId : null, { enabled: open })
  const detailQuery = source === 'self' ? selfQuery : manageQuery
  const detail = detailQuery.data
  const dicts = useNoticeDicts()
  const columns = React.useMemo(
    () =>
      noticeColumns(dicts, true).filter(
        column =>
          column.valueType !== 'dependency' &&
          ['title', 'createUserString', 'createTime', 'content'].includes(column.dataIndex ?? '')
      ),
    [dicts]
  )

  return (
    <EntityDrawer open={open} onClose={onClose} title="查看公告" icon={<Eye className="size-4" />} width={44}>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
        {detailQuery.isPending ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ) : detailQuery.isError || !detail ? (
          <QueryState state="error" onRetry={() => void detailQuery.refetch()} />
        ) : (
          <article className="flex flex-col gap-4">
            <ProDescriptions columns={columns} dataSource={detail} column={1} />
          </article>
        )}
      </div>
    </EntityDrawer>
  )
}
