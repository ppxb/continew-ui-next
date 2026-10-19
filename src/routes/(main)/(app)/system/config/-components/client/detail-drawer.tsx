import * as React from 'react'

import { cn } from 'cn'
import { Check, Copy, Smartphone, X } from 'lucide-react'

import { StatusCell } from '@/components/status-cell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { toast } from '@/components/ui/toast'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ClientResp } from '@/lib/api/client'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'

import { AUTH_TYPE_MAP, LOGOUT_MODE_MAP, REFRESH_TOKEN_MODE_MAP, REPLACED_RANGE_MAP } from './columns'

const COPIED_FEEDBACK_MS = 1500

function DetailField({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm wrap-break-word text-foreground">{children}</dd>
    </div>
  )
}

function IdField({ id }: { id: string | number }) {
  const [copied, setCopied] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  React.useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(id))
      setCopied(true)
      toast.add({ title: '已复制客户端 ID', type: 'success' })
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
          {copied ? '已复制' : '复制客户端 ID'}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

interface ClientDetailDrawerProps {
  readonly client: ClientResp | null
  readonly open: boolean
  readonly clientTypeMap: Record<string, string>
  readonly authTypeMap?: Record<string, string>
  readonly replacedRangeMap?: Record<string, string>
  readonly logoutModeMap?: Record<string, string>
  readonly onClose: () => void
}

export function ClientDetailDrawer({
  client,
  open,
  clientTypeMap,
  authTypeMap = AUTH_TYPE_MAP,
  replacedRangeMap = REPLACED_RANGE_MAP,
  logoutModeMap = LOGOUT_MODE_MAP,
  onClose
}: ClientDetailDrawerProps) {
  // Keep the Drawer mounted while closed so the first open still plays its enter transition; guard the body instead.
  return (
    <Drawer open={open} onOpenChange={isOpen => !isOpen && onClose()} swipeDirection="right">
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:32rem]">
        <DrawerHeader className="flex-row items-center justify-between gap-2 border-b p-4 md:gap-2">
          <div className="flex items-center gap-2">
            <Smartphone className="size-4" />
            <DrawerTitle>客户端详情</DrawerTitle>
          </div>
          <DrawerClose render={<Button variant="ghost" size="icon-sm" />}>
            <X className="size-4" />
            <span className="sr-only">关闭</span>
          </DrawerClose>
        </DrawerHeader>

        {client ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <DetailField label="ID">{client.id}</DetailField>
              <DetailField label="客户端 ID" className="sm:col-span-2">
                <IdField id={client.clientId} />
              </DetailField>
              <DetailField label="客户端类型" className="sm:col-span-2">
                <Badge variant="outline">{clientTypeMap[client.clientType] || client.clientType}</Badge>
              </DetailField>
              <DetailField label="认证类型" className="sm:col-span-2">
                <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap">
                  {client.authType?.map(at => (
                    <Badge key={at} variant="secondary" className="shrink-0 font-normal whitespace-nowrap">
                      {authTypeMap[at] || at}
                    </Badge>
                  ))}
                </div>
              </DetailField>
              <DetailField label="Token 最低活跃频率">
                <span>{client.activeTimeout === -1 ? '不限制' : `${client.activeTimeout} 秒`}</span>
              </DetailField>
              <DetailField label="Token 有效期">
                <span>{client.timeout === -1 ? '永不过期' : `${client.timeout} 秒`}</span>
              </DetailField>
              <DetailField label="Refresh Token 有效期">
                <span>{client.refreshTokenTimeout ? `${client.refreshTokenTimeout} 秒` : EMPTY_PLACEHOLDER}</span>
              </DetailField>
              <DetailField label="Refresh Token 传输模式">
                <span>
                  {client.refreshTokenMode
                    ? REFRESH_TOKEN_MODE_MAP[client.refreshTokenMode] || client.refreshTokenMode
                    : EMPTY_PLACEHOLDER}
                </span>
              </DetailField>
              <DetailField label="状态" className="sm:col-span-2">
                <StatusCell status={client.status} />
              </DetailField>
              <DetailField label="多地登录">
                <Badge variant={client.isConcurrent ? 'default' : 'secondary'} className="font-normal">
                  {client.isConcurrent ? '允许' : '互斥'}
                </Badge>
              </DetailField>
              <DetailField label="下线范围">
                <span>
                  {client.replacedRange
                    ? replacedRangeMap[client.replacedRange] || client.replacedRange
                    : EMPTY_PLACEHOLDER}
                </span>
              </DetailField>
              <DetailField label="登录数量">
                <span>
                  {client.maxLoginCount === -1
                    ? '不限制'
                    : client.maxLoginCount !== undefined && client.maxLoginCount !== null
                      ? `${client.maxLoginCount} 个`
                      : EMPTY_PLACEHOLDER}
                </span>
              </DetailField>
              <DetailField label="溢出处理">
                <span>
                  {client.overflowLogoutMode
                    ? logoutModeMap[client.overflowLogoutMode] || client.overflowLogoutMode
                    : EMPTY_PLACEHOLDER}
                </span>
              </DetailField>
              <DetailField label="创建人">{client.createUserString || EMPTY_PLACEHOLDER}</DetailField>
              <DetailField label="创建时间">{client.createTime || EMPTY_PLACEHOLDER}</DetailField>
              <DetailField label="修改人">{client.updateUserString || EMPTY_PLACEHOLDER}</DetailField>
              <DetailField label="修改时间">{client.updateTime || EMPTY_PLACEHOLDER}</DetailField>
            </dl>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}
