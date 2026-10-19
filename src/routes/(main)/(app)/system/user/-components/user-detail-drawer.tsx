import * as React from 'react'

import { cn } from 'cn'
import { Check, Copy, User2, X } from 'lucide-react'

import { StatusCell } from '@/components/status-cell'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { UserDetailResp } from '@/lib/api/user'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'

import { genderLabel, RoleCell } from './user-display'
import { useUserDetail } from './use-user-detail'

const COPIED_FEEDBACK_MS = 1500

function DetailField({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm wrap-break-word text-foreground">{children}</dd>
    </div>
  )
}

/** The ID is a snowflake number, so it is only useful next to a copy button. */
function IdField({ id }: { id: UserDetailResp['id'] }) {
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
      // `navigator.clipboard` only exists in a secure context, so this can fail outright.
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

function UserDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1 sm:col-span-2">
        <Skeleton className="h-3.5 w-10" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3.5 w-12" />
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3.5 w-12" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3.5 w-10" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3.5 w-10" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3.5 w-12" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3.5 w-10" />
        <Skeleton className="h-5 w-36" />
      </div>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3.5 w-10" />
        <Skeleton className="h-5 w-20 rounded-md" />
      </div>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3.5 w-14" />
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-5 w-36" />
      </div>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3.5 w-14" />
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-5 w-36" />
      </div>
      <div className="flex flex-col gap-1 sm:col-span-2">
        <Skeleton className="h-3.5 w-10" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  )
}

interface UserDetailDrawerProps {
  /** The user to show, or `null` before the first one is picked. */
  readonly userId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

/**
 * Read-only detail panel for one user.
 *
 * It renders the same field set as the Vue client's `DetailDrawer.vue`, in the same order,
 * with this project's components. `open` is separate from `userId` on purpose: clearing the
 * id on close would drop the query back to `pending` and swap the panel's content for a
 * spinner while it is still sliding out.
 */
export function UserDetailDrawer({ userId, open, onClose }: UserDetailDrawerProps) {
  // Fetch on open rather than trust the cache: another admin may have edited the record, and the
  // client turns off every automatic refetch trigger, so a plain query would keep the first response.
  const query = useUserDetail(userId, { enabled: open })

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
      {/*
        The built-in width lives on `data-[swipe-axis=x]:sm:`, so the override repeats that
        variant chain; a bare `sm:` would lose to the attribute selector on specificity.
      */}
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:32rem]">
        <DrawerHeader className="flex-row items-center justify-between gap-2 border-b p-4 md:gap-2">
          <div className="flex items-center gap-2">
            <User2 className="size-4" />
            <DrawerTitle>用户详情</DrawerTitle>
          </div>
          <DrawerClose render={<Button variant="ghost" size="icon-sm" />}>
            <X />
          </DrawerClose>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {query.isPending ? (
            <UserDetailSkeleton />
          ) : query.isError || !detail ? (
            <p className="text-sm text-foreground">加载失败，请稍后重试</p>
          ) : (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <DetailField label="ID" className="sm:col-span-2">
                <IdField id={detail.id} />
              </DetailField>
              <DetailField label="用户名">{detail.username}</DetailField>
              <DetailField label="昵称">{detail.nickname}</DetailField>
              <DetailField label="性别">{genderLabel(detail.gender)}</DetailField>
              <DetailField label="状态">
                <StatusCell status={detail.status} />
              </DetailField>
              <DetailField label="手机号">{detail.phone || EMPTY_PLACEHOLDER}</DetailField>
              <DetailField label="邮箱">{detail.email || EMPTY_PLACEHOLDER}</DetailField>
              <DetailField label="所属部门">{detail.deptName || EMPTY_PLACEHOLDER}</DetailField>
              <DetailField label="角色">
                <RoleCell roleNames={detail.roleNames ?? []} />
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
