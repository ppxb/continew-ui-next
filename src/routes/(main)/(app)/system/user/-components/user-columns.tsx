import type { ColumnDef } from '@tanstack/react-table'
import { Eye, KeyRound, MoreHorizontal, Pen, ShieldCheck, Trash2 } from 'lucide-react'

import { FlagBadge } from '@/components/data-badge'
import { StatusCell } from '@/components/status-cell'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { EMPTY_PLACEHOLDER } from '@/lib/constants'
import type { DataTableFeatures } from '@/lib/data-table-features'
import { getInitials } from '@/lib/utils'

import { genderLabel, RoleCell } from './user-display'

/** The row actions the table raises. */
export type UserAction = 'detail' | 'edit' | 'resetPassword' | 'assignRoles' | 'delete'

function TextCell({ value }: { value: string | null }) {
  return <span className="text-sm">{value || EMPTY_PLACEHOLDER}</span>
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

function RowActions({ user, onAction }: { user: UserResp; onAction: (action: UserAction, user: UserResp) => void }) {
  const isLocked = Boolean(user.disabled)

  return (
    <div className="flex items-center justify-center">
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger render={<DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />} />}>
            <MoreHorizontal />
          </TooltipTrigger>
          <TooltipContent side="top">更多操作</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => onAction('detail', user)}>
              <Eye />
              用户详情
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isLocked} onClick={() => onAction('edit', user)}>
              <Pen />
              修改用户
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem disabled={isLocked} onClick={() => onAction('resetPassword', user)}>
              <KeyRound />
              重置密码
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isLocked} onClick={() => onAction('assignRoles', user)}>
              <ShieldCheck />
              分配角色
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive" disabled={isLocked} onClick={() => onAction('delete', user)}>
              <Trash2 />
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
 * column stays continuous across server-side pages. `onAction` receives the action the row
 * raised; the flows that are not implemented yet are reported by the caller.
 */
export function createUserColumns(onAction: (action: UserAction, user: UserResp) => void, rowOffset: number) {
  const columns: ColumnDef<DataTableFeatures, UserResp>[] = [
    {
      id: 'index',
      header: '序号',
      enableHiding: false,
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
      cell: ({ row }) => <div className="text-center text-sm">{genderLabel(row.original.gender)}</div>
    },
    {
      accessorKey: 'deptName',
      header: '所属部门',
      cell: ({ row }) => <TextCell value={row.original.deptName} />
    },
    {
      accessorKey: 'roleNames',
      header: '角色',
      cell: ({ row }) => <RoleCell roleNames={row.original.roleNames ?? []} max={2} />
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
          <FlagBadge active={row.original.isSystem} activeLabel="内置" inactiveLabel="自定义" />
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
      cell: ({ row }) => <RowActions user={row.original} onAction={onAction} />
    }
  ]

  return columns
}
