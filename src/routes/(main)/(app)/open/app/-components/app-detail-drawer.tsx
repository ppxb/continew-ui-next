import { LayoutGrid } from 'lucide-react'

import { CopyableText } from '@/components/copyable-text'
import { DetailField, DetailGrid } from '@/components/detail-field'
import { EntityDrawer } from '@/components/entity-drawer'
import { StatusCell } from '@/components/status-cell'
import { Skeleton } from '@/components/ui/skeleton'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'

import { ExpireTimeCell } from './app-display'
import { useAppDetail } from './use-app-detail'

function AppDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1 sm:col-span-2">
        <Skeleton className="h-3.5 w-10" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="flex flex-col gap-1 sm:col-span-2">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="flex flex-col gap-1 sm:col-span-2">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-5 w-60" />
      </div>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3.5 w-10" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3.5 w-14" />
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="flex flex-col gap-1 sm:col-span-2">
        <Skeleton className="h-3.5 w-10" />
        <Skeleton className="h-12 w-full" />
      </div>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3.5 w-14" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-5 w-36" />
      </div>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3.5 w-14" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-5 w-36" />
      </div>
    </div>
  )
}

interface AppDetailDrawerProps {
  readonly appId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

/**
 * Read-only detail drawer for an application.
 */
export function AppDetailDrawer({ appId, open, onClose }: AppDetailDrawerProps) {
  const query = useAppDetail(appId, { enabled: open })
  const detail = query.data

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      title="应用详情"
      icon={
        <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          <LayoutGrid className="size-4" />
        </div>
      }
      width={32}
    >

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {query.isLoading ? (
            <AppDetailSkeleton />
          ) : query.isError ? (
            <div className="py-8 text-center text-sm text-destructive">获取应用详情失败，请检查网络或重试</div>
          ) : detail ? (
            <DetailGrid>
              <DetailField label="应用 ID" className="sm:col-span-2">
                <CopyableText value={String(detail.id)} label="复制 ID" className="break-all" />
              </DetailField>

              <DetailField label="应用名称" className="sm:col-span-2">
                <span className="font-medium text-foreground">{detail.name}</span>
              </DetailField>

              <DetailField label="Access Key" className="sm:col-span-2">
                <CopyableText
                  value={detail.accessKey}
                  label="复制 Access Key"
                  successMessage="Access Key 已复制到剪贴板"
                  className="break-all"
                />
              </DetailField>

              <DetailField label="状态">
                <StatusCell status={detail.status} />
              </DetailField>

              <DetailField label="失效时间">
                <ExpireTimeCell expireTime={detail.expireTime} />
              </DetailField>

              <DetailField label="应用描述" className="sm:col-span-2">
                <span className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {detail.description || EMPTY_PLACEHOLDER}
                </span>
              </DetailField>

              <DetailField label="创建人">{detail.createUserString || EMPTY_PLACEHOLDER}</DetailField>
              <DetailField label="创建时间">{detail.createTime || EMPTY_PLACEHOLDER}</DetailField>
              <DetailField label="修改人">{detail.updateUserString || EMPTY_PLACEHOLDER}</DetailField>
              <DetailField label="修改时间">{detail.updateTime || EMPTY_PLACEHOLDER}</DetailField>
            </DetailGrid>
          ) : null}
        </div>
    </EntityDrawer>
  )
}
