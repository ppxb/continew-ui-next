import type { ColumnDef } from '@tanstack/react-table'

import { KeyRound, PenLine, ShieldCheck, Trash2, Users } from 'lucide-react'

import { FlagBadge, TypeBadge, type TypeTone } from '@/components/data-badge'
import { RowActionsMenu } from '@/components/row-actions-menu'
import { dateTimeColumn, indexColumn, optionColumn, textColumn } from '@/components/table/columns'
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { DATA_SCOPE_MAP, type DataScope, type RoleResp } from '@/lib/api/role'
import type { DataTableFeatures } from '@/lib/data-table-features'

/** The row actions the table raises. */
export type RoleAction = 'edit' | 'permission' | 'members' | 'delete'

const DATA_SCOPE_TONES: Record<DataScope, TypeTone> = {
  1: 'blue',
  2: 'teal',
  3: 'teal',
  4: 'neutral',
  5: 'violet'
}

function DataScopeBadge({ scope }: { scope: DataScope }) {
  return <TypeBadge tone={DATA_SCOPE_TONES[scope]} label={DATA_SCOPE_MAP[scope]} />
}

function RowActions({ role, onAction }: { role: RoleResp; onAction: (action: RoleAction, role: RoleResp) => void }) {
  const isSystem = Boolean(role.isSystem)

  return (
    <RowActionsMenu>
      <DropdownMenuGroup>
        <DropdownMenuItem disabled={isSystem} onClick={() => onAction('edit', role)}>
          <PenLine />
          修改角色
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isSystem} onClick={() => onAction('permission', role)}>
          <KeyRound />
          功能权限
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isSystem} onClick={() => onAction('members', role)}>
          <Users />
          关联用户
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" disabled={isSystem} onClick={() => onAction('delete', role)}>
        <Trash2 />
        删除
      </DropdownMenuItem>
    </RowActionsMenu>
  )
}

/** Builds the role table columns; the serial number follows the row's index in the full data set. */
export function createRoleColumns(
  onAction: (action: RoleAction, role: RoleResp) => void
): ColumnDef<DataTableFeatures, RoleResp>[] {
  return [
    indexColumn(),
    {
      accessorKey: 'name',
      header: '角色名称',
      meta: { valueType: 'text' },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span>{row.original.name}</span>
          <FlagBadge active={row.original.isSystem} activeLabel="内置" icon={<ShieldCheck />} />
        </div>
      )
    },
    textColumn('code', '角色编码'),
    {
      accessorKey: 'dataScope',
      header: '数据权限',
      meta: { valueType: 'status' },
      cell: ({ row }) => <DataScopeBadge scope={row.original.dataScope} />
    },
    {
      accessorKey: 'sort',
      header: '排序',
      meta: { valueType: 'text' },
      cell: ({ row }) => <span className="tabular-nums">{row.original.sort}</span>
    },
    textColumn('description', '描述'),
    textColumn('createUserString', '创建人'),
    dateTimeColumn('createTime', '创建时间'),
    textColumn('updateUserString', '修改人'),
    dateTimeColumn('updateTime', '修改时间'),
    optionColumn(role => <RowActions role={role} onAction={onAction} />)
  ]
}
