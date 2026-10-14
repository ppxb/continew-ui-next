import type { ColumnDef } from '@tanstack/react-table'

import { MoreHorizontal } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import type { UserResp } from '@/lib/api/user'
import type { DataTableFeatures } from '@/lib/data-table-features'
import { getInitials } from '@/lib/utils'

/** `GenderEnum` arrives as its numeric value. */
const GENDER_LABELS: Record<number, string> = {
  0: '未知',
  1: '男',
  2: '女'
}

/** A cell the backend masks before it leaves the server. */
const EMPTY_PLACEHOLDER = '—'

function TextCell({ value }: { value: string | null }) {
  return <span className="text-sm">{value || EMPTY_PLACEHOLDER}</span>
}

function StatusCell({ status }: { status: UserResp['status'] }) {
  const isEnabled = status === 1

  return (
    <Badge variant="outline" className="gap-1.5 border px-2 py-1 font-medium">
      <span className={isEnabled ? 'size-1.5 rounded-full bg-green-600' : 'size-1.5 rounded-full bg-destructive'} />
      {isEnabled ? '启用' : '禁用'}
    </Badge>
  )
}

function NicknameCell({ user }: { user: UserResp }) {
  const name = user.nickname || user.username

  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-8">
        <AvatarImage src={user.avatar ?? undefined} alt="" />
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>
      <span className="truncate text-sm font-medium text-foreground">{name}</span>
    </div>
  )
}

function RoleCell({ roleNames }: { roleNames: string[] }) {
  if (!roleNames.length) {
    return <span className="text-sm text-muted-foreground">{EMPTY_PLACEHOLDER}</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {roleNames.map(roleName => (
        <Badge key={roleName} variant="secondary" className="font-normal">
          {roleName}
        </Badge>
      ))}
    </div>
  )
}

function RowActions({ user, onAction }: { user: UserResp; onAction: (label: string, user: UserResp) => void }) {
  const isLocked = Boolean(user.disabled)

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
            <DropdownMenuItem onClick={() => onAction('详情', user)}>详情</DropdownMenuItem>
            <DropdownMenuItem disabled={isLocked} onClick={() => onAction('修改', user)}>
              修改
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem disabled={isLocked} onClick={() => onAction('重置密码', user)}>
              重置密码
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isLocked} onClick={() => onAction('分配角色', user)}>
              分配角色
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive" disabled={isLocked} onClick={() => onAction('删除', user)}>
              删除
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/**
 * Builds the column set of the user table.
 *
 * `rowOffset` is the index of the first row on the current page, so the serial number
 * column stays continuous across server-side pages. `onAction` receives the label of a
 * row action; those flows are not implemented yet, so the caller decides how to report it.
 */
export function createUserColumns(onAction: (label: string, user: UserResp) => void, rowOffset: number) {
  const columns: ColumnDef<DataTableFeatures, UserResp>[] = [
    {
      id: 'index',
      header: '序号',
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="text-center text-sm text-muted-foreground tabular-nums">{rowOffset + row.index + 1}</div>
      )
    },
    {
      accessorKey: 'nickname',
      header: '昵称',
      cell: ({ row }) => <NicknameCell user={row.original} />
    },
    {
      accessorKey: 'username',
      header: '用户名',
      cell: ({ row }) => <span className="text-sm">{row.original.username}</span>
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
      accessorKey: 'gender',
      header: '性别',
      cell: ({ row }) => <div className="text-center text-sm">{GENDER_LABELS[row.original.gender] ?? '未知'}</div>
    },
    {
      accessorKey: 'deptName',
      header: '所属部门',
      cell: ({ row }) => <TextCell value={row.original.deptName} />
    },
    {
      accessorKey: 'roleNames',
      header: '角色',
      cell: ({ row }) => <RoleCell roleNames={row.original.roleNames ?? []} />
    },
    {
      accessorKey: 'phone',
      header: '手机号',
      cell: ({ row }) => <TextCell value={row.original.phone} />
    },
    {
      accessorKey: 'email',
      header: '邮箱',
      cell: ({ row }) => <TextCell value={row.original.email} />
    },
    {
      accessorKey: 'isSystem',
      header: '系统内置',
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant={row.original.isSystem ? 'destructive' : 'secondary'} className="font-normal">
            {row.original.isSystem ? '是' : '否'}
          </Badge>
        </div>
      )
    },
    {
      accessorKey: 'description',
      header: '描述',
      cell: ({ row }) => <TextCell value={row.original.description} />
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
      enableSorting: false,
      cell: ({ row }) => <RowActions user={row.original} onAction={onAction} />
    }
  ]

  return columns
}
