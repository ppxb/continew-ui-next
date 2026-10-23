import type { ReactNode } from 'react'

import { FileText } from 'lucide-react'

import { EntityDrawer } from '@/components/entity-drawer'
import { QueryState } from '@/components/query-state'
import { Skeleton } from '@/components/ui/skeleton'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'

import { NoticeMethodTags, NoticeStatusBadge, NoticeTypeBadge, noticeOptionLabel } from './notice-display'
import { useNoticeDetail } from './use-notice-detail'
import { useNoticeDicts } from './use-notice-dicts'

interface NoticeDetailDrawerProps {
  readonly noticeId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-sm break-words">{children}</div>
    </div>
  )
}

/** The Vue DetailDrawer's fields, laid out as a two-column drawer. */
export function NoticeDetailDrawer({ noticeId, open, onClose }: NoticeDetailDrawerProps) {
  const { scopeOptions, methodOptions, statusOptions, typeOptions } = useNoticeDicts()
  const detailQuery = useNoticeDetail(noticeId, { enabled: open })
  const detail = detailQuery.data

  return (
    <EntityDrawer open={open} onClose={onClose} title="公告详情" icon={<FileText className="size-4" />} width={40}>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
        {detailQuery.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : detailQuery.isError || !detail ? (
          <QueryState state="error" onRetry={() => void detailQuery.refetch()} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <DetailItem label="ID">
                <span className="font-mono text-xs">{detail.id}</span>
              </DetailItem>
            </div>
            <DetailItem label="标题">{detail.title}</DetailItem>
            <DetailItem label="分类">
              <NoticeTypeBadge type={detail.type} options={typeOptions} />
            </DetailItem>
            <DetailItem label="通知范围">{noticeOptionLabel(scopeOptions, detail.noticeScope)}</DetailItem>
            <DetailItem label="通知方式">
              <NoticeMethodTags methods={detail.noticeMethods} options={methodOptions} />
            </DetailItem>
            <DetailItem label="是否定时">{detail.isTiming ? '是' : '否'}</DetailItem>
            <DetailItem label="发布时间">{detail.publishTime || EMPTY_PLACEHOLDER}</DetailItem>
            <DetailItem label="是否置顶">{detail.isTop ? '是' : '否'}</DetailItem>
            <DetailItem label="状态">
              <NoticeStatusBadge status={detail.status} options={statusOptions} />
            </DetailItem>
            <DetailItem label="创建人">{detail.createUserString || EMPTY_PLACEHOLDER}</DetailItem>
            <DetailItem label="创建时间">{detail.createTime || EMPTY_PLACEHOLDER}</DetailItem>
            <DetailItem label="修改人">{detail.updateUserString || EMPTY_PLACEHOLDER}</DetailItem>
            <DetailItem label="修改时间">{detail.updateTime || EMPTY_PLACEHOLDER}</DetailItem>
          </div>
        )}
      </div>
    </EntityDrawer>
  )
}
