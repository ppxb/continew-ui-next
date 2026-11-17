import * as React from 'react'
import { FileText } from 'lucide-react'

import { EntityDrawer } from '@/components/entity-drawer'
import { ProDescriptions } from '@/components/pro'
import { QueryState } from '@/components/query-state'

import { noticeColumns } from './notice-columns'
import { useNoticeDetail } from './use-notice-detail'
import { useNoticeDicts } from './use-notice-dicts'

interface NoticeDetailDrawerProps {
  readonly noticeId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

export function NoticeDetailDrawer({ noticeId, open, onClose }: NoticeDetailDrawerProps) {
  const dicts = useNoticeDicts()
  const columns = React.useMemo(() => noticeColumns(dicts), [dicts])
  const query = useNoticeDetail(noticeId, { enabled: open })

  return <EntityDrawer open={open} onClose={onClose} title="公告详情" icon={<FileText className="size-4" />} width={40}>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
      {query.isError || (!query.isPending && !query.data) ? <QueryState state="error" onRetry={() => void query.refetch()} /> : <ProDescriptions columns={columns} dataSource={query.data} loading={query.isPending} />}
    </div>
  </EntityDrawer>
}
