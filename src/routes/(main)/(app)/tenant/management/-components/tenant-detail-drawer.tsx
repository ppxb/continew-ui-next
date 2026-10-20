import type { ReactNode } from 'react'

import { cn } from 'cn'
import { Building2, X } from 'lucide-react'

import { CopyableText } from '@/components/copyable-text'
import { StatusCell } from '@/components/status-cell'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Skeleton } from '@/components/ui/skeleton'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'

import { DomainCell, ExpireTimeCell } from './tenant-display'
import { useTenantDetail } from './use-tenant-detail'

function DetailField({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm wrap-break-word text-foreground">{children}</dd>
    </div>
  )
}

function TenantDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {Array.from({ length: 12 }, (_, index) => (
        <div key={index} className="flex flex-col gap-1">
          <Skeleton className="h-3.5 w-14" />
          <Skeleton className="h-5 w-28" />
        </div>
      ))}
    </div>
  )
}

interface TenantDetailDrawerProps {
  /** The tenant to show, or `null` before the first one is picked. */
  readonly tenantId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

/** Read-only detail panel for one tenant, with the field order of the Vue client's drawer. */
export function TenantDetailDrawer({ tenantId, open, onClose }: TenantDetailDrawerProps) {
  const query = useTenantDetail(tenantId, { enabled: open })
  const detail = query.data

  return (
    <Drawer
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen) {
          onClose()
        }
      }}
      swipeDirection="right"
    >
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:36rem]">
        <DrawerHeader className="flex-row items-center justify-between gap-2 border-b p-4 md:gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="size-4" />
            <DrawerTitle>租户详情</DrawerTitle>
          </div>
          <DrawerClose render={<Button variant="ghost" size="icon-sm" />}>
            <X />
          </DrawerClose>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {query.isPending ? (
            <TenantDetailSkeleton />
          ) : query.isError || !detail ? (
            <p className="text-sm text-foreground">加载失败，请稍后重试</p>
          ) : (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <DetailField label="ID">
                <CopyableText value={String(detail.id)} />
              </DetailField>
              <DetailField label="编码">
                <CopyableText value={detail.code} />
              </DetailField>
              <DetailField label="名称">{detail.name || EMPTY_PLACEHOLDER}</DetailField>
              <DetailField label="套餐">{detail.packageName || EMPTY_PLACEHOLDER}</DetailField>
              <DetailField label="域名">
                <DomainCell domain={detail.domain} />
              </DetailField>
              <DetailField label="过期时间">
                <ExpireTimeCell value={detail.expireTime} />
              </DetailField>
              <DetailField label="管理员用户">{detail.adminUsername || EMPTY_PLACEHOLDER}</DetailField>
              <DetailField label="状态">
                <StatusCell status={detail.status} />
              </DetailField>
              <DetailField label="创建人">{detail.createUserString || EMPTY_PLACEHOLDER}</DetailField>
              <DetailField label="创建时间">{detail.createTime || EMPTY_PLACEHOLDER}</DetailField>
              <DetailField label="修改人">{detail.updateUserString || EMPTY_PLACEHOLDER}</DetailField>
              <DetailField label="修改时间">{detail.updateTime || EMPTY_PLACEHOLDER}</DetailField>
              <DetailField label="描述" className="sm:col-span-2">
                {detail.description || EMPTY_PLACEHOLDER}
              </DetailField>
            </dl>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
