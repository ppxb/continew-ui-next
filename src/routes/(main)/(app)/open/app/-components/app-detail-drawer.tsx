import * as React from 'react'

import { cn } from 'cn'
import { Check, Copy, LayoutGrid, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { AppDetailResp } from '@/lib/api/app'

import { EMPTY_PLACEHOLDER, ExpireTimeCell, StatusCell } from './app-display'
import { useAppDetail } from './use-app-detail'

const COPIED_FEEDBACK_MS = 1500

function DetailField({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm wrap-break-word text-foreground">{children}</dd>
    </div>
  )
}

function IdField({ id }: { id: AppDetailResp['id'] }) {
  const [copied, setCopied] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  React.useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(id))
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS)
    } catch {
      toast.add({ title: '复制失败，请手动选择 ID', type: 'error' })
    }
  }

  return (
    <div className="flex items-center gap-1">
      <span className="break-all">{id}</span>
      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="icon-sm" onClick={() => void copy()} />}>
          {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          {copied ? '已复制' : '复制 ID'}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

function AccessKeyField({ accessKey }: { accessKey: string }) {
  const [copied, setCopied] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  React.useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(accessKey)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS)
      toast.add({ title: 'Access Key 已复制到剪贴板', type: 'success' })
    } catch {
      toast.add({ title: '复制失败，请手动选择复制', type: 'error' })
    }
  }

  return (
    <div className="flex items-center gap-1">
      <span className="break-all">{accessKey}</span>
      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="icon-sm" onClick={() => void copy()} />}>
          {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          {copied ? '已复制' : '复制 Access Key'}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

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
    <Drawer
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen) {
          onClose()
        }
      }}
      swipeDirection="right"
    >
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:32rem]">
        <DrawerHeader className="flex-row items-center justify-between gap-2 border-b p-4 md:gap-2">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <LayoutGrid className="size-4" />
            </div>
            <DrawerTitle className="text-base font-semibold">应用详情</DrawerTitle>
          </div>
          <DrawerClose render={<Button variant="ghost" size="icon-sm" />}>
            <X className="size-4" />
            <span className="sr-only">关闭</span>
          </DrawerClose>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {query.isLoading ? (
            <AppDetailSkeleton />
          ) : query.isError ? (
            <div className="py-8 text-center text-sm text-destructive">获取应用详情失败，请检查网络或重试</div>
          ) : detail ? (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <DetailField label="应用 ID" className="sm:col-span-2">
                <IdField id={detail.id} />
              </DetailField>

              <DetailField label="应用名称" className="sm:col-span-2">
                <span className="font-medium text-foreground">{detail.name}</span>
              </DetailField>

              <DetailField label="Access Key" className="sm:col-span-2">
                <AccessKeyField accessKey={detail.accessKey} />
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
            </dl>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
