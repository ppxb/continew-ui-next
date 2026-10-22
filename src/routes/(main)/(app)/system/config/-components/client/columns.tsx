import type { ColumnDef } from '@tanstack/react-table'
import { Eye, MoreHorizontal, PenLine, Trash2 } from 'lucide-react'

import { CopyButton } from '@/components/copy-button'
import { FlagBadge, TypeBadge, type TypeTone } from '@/components/data-badge'
import { StatusCell } from '@/components/status-cell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ClientResp } from '@/lib/api/client'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'
import type { DataTableFeatures } from '@/lib/data-table-features'

export const AUTH_TYPE_OPTIONS = [
  { label: '账号密码', value: 'ACCOUNT' },
  { label: '短信验证码', value: 'SMS' },
  { label: '邮箱验证码', value: 'EMAIL' },
  { label: '三方授权', value: 'SOCIAL' }
]

export const AUTH_TYPE_MAP: Record<string, string> = {
  ACCOUNT: '账号密码',
  SMS: '短信验证码',
  EMAIL: '邮箱验证码',
  SOCIAL: '三方授权'
}

export const REFRESH_TOKEN_MODE_OPTIONS = [
  { label: 'Cookie（Web）', value: 'COOKIE' },
  { label: '响应体（App / 小程序）', value: 'BODY' }
]

export const REFRESH_TOKEN_MODE_MAP: Record<string, string> = {
  COOKIE: 'Cookie（Web）',
  BODY: '响应体（App / 小程序）'
}

export const REPLACED_RANGE_PRESETS = [
  { label: '当前客户端类型', value: 'CURR_DEVICE_TYPE' },
  { label: '所有客户端类型', value: 'ALL_DEVICE_TYPE' }
]

export const REPLACED_RANGE_MAP: Record<string, string> = {
  CURR_DEVICE_TYPE: '当前客户端类型',
  ALL_DEVICE_TYPE: '所有客户端类型'
}

export const LOGOUT_MODE_PRESETS = [
  { label: '注销下线', value: 'LOGOUT' },
  { label: '踢人下线', value: 'KICKOUT' },
  { label: '顶人下线', value: 'REPLACED' }
]

export const LOGOUT_MODE_MAP: Record<string, string> = {
  LOGOUT: '注销下线',
  KICKOUT: '踢人下线',
  REPLACED: '顶人下线'
}

const CLIENT_TYPE_TONES: Record<string, TypeTone> = {
  PC: 'blue',
  APP: 'teal',
  MINI: 'amber',
  WEB: 'violet'
}

export type ClientAction = 'detail' | 'edit' | 'delete'

function TextCell({ value }: { value: string | null | undefined }) {
  return <span className="text-sm">{value || EMPTY_PLACEHOLDER}</span>
}

function ClientIdCell({ clientId }: { clientId: string }) {
  return (
    <div className="flex items-center gap-1.5 text-foreground">
      <span className="truncate">{clientId}</span>
      <CopyButton
        value={clientId}
        label="复制客户端 ID"
        successMessage="已复制客户端 ID"
        className="size-6 text-muted-foreground transition-colors hover:text-foreground"
      />
    </div>
  )
}

function AuthTypeCell({ authTypes, authTypeMap }: { authTypes?: string[]; authTypeMap?: Record<string, string> }) {
  if (!authTypes?.length) {
    return <span className="text-sm">{EMPTY_PLACEHOLDER}</span>
  }

  const map = authTypeMap ?? AUTH_TYPE_MAP

  return (
    <div className="flex items-center gap-1 whitespace-nowrap">
      {authTypes.map(at => (
        <Badge key={at} variant="secondary" className="shrink-0 font-normal whitespace-nowrap">
          {map[at] || at}
        </Badge>
      ))}
    </div>
  )
}

function RowActions({
  client,
  onAction,
  canGet,
  canUpdate,
  canDelete
}: {
  client: ClientResp
  onAction: (action: ClientAction, client: ClientResp) => void
  canGet: boolean
  canUpdate: boolean
  canDelete: boolean
}) {
  const isLocked = Boolean(client.disabled)

  return (
    <div className="flex items-center justify-center">
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger render={<DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />} />}>
            <MoreHorizontal className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            更多操作
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            {canGet && (
              <DropdownMenuItem onClick={() => onAction('detail', client)}>
                <Eye />
                客户端详情
              </DropdownMenuItem>
            )}
            {canUpdate && (
              <DropdownMenuItem disabled={isLocked} onClick={() => onAction('edit', client)}>
                <PenLine />
                修改客户端
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive" disabled={isLocked} onClick={() => onAction('delete', client)}>
                  <Trash2 />
                  删除
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function createClientColumns(
  onAction: (action: ClientAction, record: ClientResp) => void,
  rowOffset: number,
  clientTypeMap: Record<string, string>,
  authTypeMap: Record<string, string>,
  replacedRangeMap: Record<string, string>,
  logoutModeMap: Record<string, string>,
  canGet: boolean,
  canUpdate: boolean,
  canDelete: boolean
): ColumnDef<DataTableFeatures, ClientResp>[] {
  return [
    {
      id: 'index',
      header: '序号',
      enableHiding: false,
      cell: ({ row }) => (
        <div className="text-center text-sm text-muted-foreground tabular-nums">{rowOffset + row.index + 1}</div>
      )
    },
    {
      accessorKey: 'clientId',
      header: '客户端 ID',
      enableHiding: false,
      cell: ({ row }) => <ClientIdCell clientId={row.original.clientId} />
    },
    {
      accessorKey: 'clientType',
      header: '客户端类型',
      cell: ({ row }) => (
        <TypeBadge
          tone={CLIENT_TYPE_TONES[row.original.clientType] ?? 'neutral'}
          label={clientTypeMap[row.original.clientType] || row.original.clientType}
        />
      )
    },
    {
      accessorKey: 'authType',
      header: '认证类型',
      cell: ({ row }) => <AuthTypeCell authTypes={row.original.authType} authTypeMap={authTypeMap} />
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => (
        <div className="text-center">
          <StatusCell status={row.original.status} />
        </div>
      )
    },
    {
      accessorKey: 'activeTimeout',
      header: 'Token 最低活跃频率',
      cell: ({ row }) => {
        const val = row.original.activeTimeout
        return <span>{val === -1 ? '不限制' : `${val} 秒`}</span>
      }
    },
    {
      accessorKey: 'timeout',
      header: 'Token 有效期',
      cell: ({ row }) => {
        const val = row.original.timeout
        return <span>{val === -1 ? '永不过期' : `${val} 秒`}</span>
      }
    },
    {
      accessorKey: 'refreshTokenTimeout',
      header: 'Refresh Token 有效期',
      cell: ({ row }) => {
        const val = row.original.refreshTokenTimeout
        return <span>{val ? `${val} 秒` : EMPTY_PLACEHOLDER}</span>
      }
    },
    {
      accessorKey: 'refreshTokenMode',
      header: 'Refresh Token 传输模式',
      cell: ({ row }) => {
        const mode = row.original.refreshTokenMode
        const text = mode ? REFRESH_TOKEN_MODE_MAP[mode] || mode : EMPTY_PLACEHOLDER
        return <span className="text-sm">{text}</span>
      }
    },
    {
      accessorKey: 'isConcurrent',
      header: '多地登录',
      cell: ({ row }) => (
        <div className="text-center">
          <FlagBadge active={row.original.isConcurrent} activeLabel="允许" inactiveLabel="互斥" />
        </div>
      )
    },
    {
      accessorKey: 'replacedRange',
      header: '下线范围',
      cell: ({ row }) => {
        const val = row.original.replacedRange
        const text = val ? replacedRangeMap[val] || val : EMPTY_PLACEHOLDER
        return <span className="text-sm">{text}</span>
      }
    },
    {
      accessorKey: 'maxLoginCount',
      header: '登录数量',
      cell: ({ row }) => {
        const val = row.original.maxLoginCount
        if (val === -1) return <span className="text-sm">不限制</span>
        if (val !== undefined && val !== null) return <span>{val} 个</span>
        return <span className="text-sm">{EMPTY_PLACEHOLDER}</span>
      }
    },
    {
      accessorKey: 'overflowLogoutMode',
      header: '溢出处理',
      cell: ({ row }) => {
        const val = row.original.overflowLogoutMode
        const text = val ? logoutModeMap[val] || val : EMPTY_PLACEHOLDER
        return <span className="text-sm">{text}</span>
      }
    },
    {
      accessorKey: 'createUserString',
      header: '创建人',
      cell: ({ row }) => <TextCell value={row.original.createUserString} />
    },
    {
      accessorKey: 'createTime',
      header: '创建时间',
      cell: ({ row }) => <TextCell value={row.original.createTime} />
    },
    {
      accessorKey: 'updateUserString',
      header: '修改人',
      cell: ({ row }) => <TextCell value={row.original.updateUserString} />
    },
    {
      accessorKey: 'updateTime',
      header: '修改时间',
      cell: ({ row }) => <TextCell value={row.original.updateTime} />
    },
    {
      id: 'actions',
      header: () => <div className="text-center">操作</div>,
      enableHiding: false,
      cell: ({ row }) => (
        <RowActions
          client={row.original}
          onAction={onAction}
          canGet={canGet}
          canUpdate={canUpdate}
          canDelete={canDelete}
        />
      )
    }
  ]
}
