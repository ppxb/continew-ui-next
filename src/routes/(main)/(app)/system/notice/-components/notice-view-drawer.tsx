import { Eye, X } from 'lucide-react'

import { RichTextContent } from '@/components/rich-text-editor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
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
    <Drawer open={open} onOpenChange={next => (!next ? onClose() : undefined)} swipeDirection="right">
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:44rem]">
        <DrawerHeader className="flex-row items-center justify-between gap-2 border-b p-4 md:gap-2">
          <div className="flex items-center gap-2">
            <Eye className="size-4" />
            <DrawerTitle>查看公告</DrawerTitle>
          </div>
          <DrawerClose render={<Button variant="ghost" size="icon-sm" />}>
            <X />
          </DrawerClose>
        </DrawerHeader>

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
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm text-foreground">加载失败，请稍后重试</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void detailQuery.refetch()}>
                重新加载
              </Button>
            </div>
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
      </DrawerContent>
    </Drawer>
  )
}
