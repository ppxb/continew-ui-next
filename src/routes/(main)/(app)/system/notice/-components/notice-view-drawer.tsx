import { Eye } from 'lucide-react'

import { EntityDrawer } from '@/components/entity-drawer'
import { QueryState } from '@/components/query-state'
import { RichTextContent } from '@/components/rich-text-editor'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

import { useNoticeDetail } from './use-notice-detail'

interface NoticeViewDrawerProps {
  readonly noticeId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

/** The reader view from the Vue page, presented in a drawer as requested. */
export function NoticeViewDrawer({ noticeId, open, onClose }: NoticeViewDrawerProps) {
  const detailQuery = useNoticeDetail(noticeId, { enabled: open })
  const detail = detailQuery.data

  return (
    <EntityDrawer open={open} onClose={onClose} title="查看公告" icon={<Eye className="size-4" />} width={44}>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
          {detailQuery.isPending ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ) : detailQuery.isError || !detail ? (
            <QueryState state="error" onRetry={() => void detailQuery.refetch()} />
          ) : (
            <article className="flex flex-col gap-4">
              <header className="flex flex-col gap-2 border-b pb-4">
                <div className="flex items-start gap-2">
                  <h2 className="min-w-0 flex-1 text-xl leading-snug font-semibold">{detail.title}</h2>
                  {detail.isTop ? (
                    <Badge variant="secondary" className="shrink-0 font-normal">
                      置顶
                    </Badge>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>发布人：{detail.createUserString || '—'}</span>
                  <span>发布时间：{detail.publishTime || '—'}</span>
                  {detail.updateTime ? <span>更新时间：{detail.updateTime}</span> : null}
                </div>
              </header>

              <RichTextContent html={detail.content} />
            </article>
          )}
        </div>
    </EntityDrawer>
  )
}
