import type { ColumnDef } from '@tanstack/react-table'
import { Eye, KeyRound, Pen, ShieldCheck, Trash2 } from 'lucide-react'

import { FlagBadge, TagList } from '@/components/data-badge'
import { RowActionsMenu } from '@/components/row-actions-menu'
import { dateTimeColumn, indexColumn, optionColumn, statusColumn, textColumn } from '@/components/table/columns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import type { UserResp } from '@/lib/api/user'
import type { DataTableFeatures } from '@/lib/data-table-features'
import { hasPermission } from '@/lib/permission'
import { getInitials } from '@/lib/utils'

import { genderLabel } from './user-display'

export type UserAction = 'detail' | 'edit' | 'resetPassword' | 'assignRoles' | 'delete'

function NicknameCell({ user }: { user: UserResp }) {
  const name = user.nickname || user.username

  return (
    <div className="flex items-center gap-2">
      <Avatar>
        <AvatarImage src={user.avatar ?? undefined} />
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>
      <span className="max-w-56 min-w-0 truncate" title={name}>
        {name}
      </span>
    </div>
  )
}

function RowActions({
  user,
  onAction,
  permissions
}: {
  user: UserResp
  onAction: (action: UserAction, user: UserResp) => void
  permissions: readonly string[]
}) {
  const isLocked = Boolean(user.disabled)
  const canResetPassword = hasPermission(permissions, 'system:user:resetPwd')
  const canAssignRoles = hasPermission(permissions, 'system:user:updateRole')

  return (
    <RowActionsMenu>
      <DropdownMenuGroup>
        <DropdownMenuItem onClick={() => onAction('detail', user)}>
          <Eye />
          用户详情
        </DropdownMenuItem>
        {hasPermission(permissions, 'system:user:update') && (
          <DropdownMenuItem disabled={isLocked} onClick={() => onAction('edit', user)}>
            <Pen />
            修改用户
          </DropdownMenuItem>
        )}
      </DropdownMenuGroup>
      {(canResetPassword || canAssignRoles) && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {canResetPassword && (
              <DropdownMenuItem disabled={isLocked} onClick={() => onAction('resetPassword', user)}>
                <KeyRound />
                重置密码
              </DropdownMenuItem>
            )}
            {canAssignRoles && (
              <DropdownMenuItem disabled={isLocked} onClick={() => onAction('assignRoles', user)}>
                <ShieldCheck />
                分配角色
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        </>
      )}
      {hasPermission(permissions, 'system:user:delete') && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" disabled={isLocked} onClick={() => onAction('delete', user)}>
            <Trash2 />
            删除
          </DropdownMenuItem>
        </>
      )}
    </RowActionsMenu>
  )
}

export function createUserColumns(
  onAction: (action: UserAction, user: UserResp) => void,
  rowOffset: number,
  permissions: readonly string[]
) {
  const columns: ColumnDef<DataTableFeatures, UserResp>[] = [
    indexColumn(rowOffset),
    {
      accessorKey: 'nickname',
      header: '昵称',
      meta: { valueType: 'text' },
      cell: ({ row }) => <NicknameCell user={row.original} />
    },
    textColumn('username', '用户名'),
    statusColumn('status'),
    {
      accessorKey: 'gender',
      header: '性别',
      meta: { valueType: 'text' },
      cell: ({ row }) => genderLabel(row.original.gender)
    },
    textColumn('deptName', '所属部门'),
    {
      accessorKey: 'roleNames',
      header: '角色',
      meta: { valueType: 'status' },
      cell: ({ row }) => <TagList items={row.original.roleNames} max={1} />
    },
    textColumn('phone', '手机号'),
    textColumn('email', '邮箱'),
    {
      accessorKey: 'isSystem',
      header: '系统内置',
      meta: { valueType: 'status' },
      cell: ({ row }) => <FlagBadge active={row.original.isSystem} activeLabel="内置" inactiveLabel="自定义" />
    },
    textColumn('description', '描述'),
    textColumn('createUserString', '创建人'),
    dateTimeColumn('createTime', '创建时间'),
    textColumn('updateUserString', '修改人'),
    dateTimeColumn('updateTime', '修改时间'),
    optionColumn(user => <RowActions user={user} onAction={onAction} permissions={permissions} />)
  ]

  return columns
}
