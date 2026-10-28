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
  return <span>{value || EMPTY_PLACEHOLDER}</span>
}

type TextColumnKey =
  | 'deptName'
  | 'phone'
  | 'email'
  | 'description'
  | 'createUserString'
  | 'createTime'
  | 'updateUserString'
  | 'updateTime'

function textColumn(key: TextColumnKey, header: string): ColumnDef<DataTableFeatures, UserResp> {
  return {
    accessorKey: key,
    header,
    cell: ({ row }) => <TextCell value={row.original[key]} />
  }
}

function NicknameCell({ user }: { user: UserResp }) {
  const name = user.nickname || user.username

  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-8">
        <AvatarImage src={user.avatar ?? undefined} alt="" />
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>
      <span className="truncate">{name}</span>
    </div>
  )
}

function RowActions({ user, onAction }: { user: UserResp; onAction: (action: UserAction, user: UserResp) => void }) {
  const isLocked = Boolean(user.disabled)

  return (
    <div className="flex items-center">
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
          <DropdownMenuItem variant="destructive" disabled={isLocked} onClick={() => onAction('delete', user)}>
            <Trash2 />
            删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/**
 * Builds the user table columns; `rowOffset` keeps the serial number continuous across pages.
 */
export function createUserColumns(onAction: (action: UserAction, user: UserResp) => void, rowOffset: number) {
  const columns: ColumnDef<DataTableFeatures, UserResp>[] = [
    {
      id: 'index',
      header: '序号',
      enableHiding: false,
      cell: ({ row }) => <div className="tabular-nums">{rowOffset + row.index + 1}</div>
    },
    {
      accessorKey: 'nickname',
      header: '昵称',
      cell: ({ row }) => <NicknameCell user={row.original} />
    },
    {
      accessorKey: 'username',
      header: '用户名',
      cell: ({ row }) => <span>{row.original.username}</span>
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => <StatusCell status={row.original.status} />
    },
    {
      accessorKey: 'gender',
      header: '性别',
      cell: ({ row }) => <span>{genderLabel(row.original.gender)}</span>
    },
    textColumn('deptName', '所属部门'),
    {
      accessorKey: 'roleNames',
      header: '角色',
      cell: ({ row }) => <RoleCell roleNames={row.original.roleNames ?? []} max={1} />
    },
    textColumn('phone', '手机号'),
    textColumn('email', '邮箱'),
    {
      accessorKey: 'isSystem',
      header: '系统内置',
      cell: ({ row }) => <FlagBadge active={row.original.isSystem} activeLabel="内置" inactiveLabel="自定义" />
    },
    textColumn('description', '描述'),
    textColumn('createUserString', '创建人'),
    textColumn('createTime', '创建时间'),
    textColumn('updateUserString', '修改人'),
    textColumn('updateTime', '修改时间'),
    {
      id: 'actions',
      header: '操作',
      enableHiding: false,
      cell: ({ row }) => <RowActions user={row.original} onAction={onAction} />
    }
  ]

  return columns
}
