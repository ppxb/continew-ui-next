import type { ColumnDef } from '@tanstack/react-table'

import { KeyRound, MoreHorizontal, PenLine, ShieldCheck, Trash2, Users } from 'lucide-react'

import { FlagBadge, TypeBadge, type TypeTone } from '@/components/data-badge'
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
import { DATA_SCOPE_MAP, type DataScope, type RoleResp } from '@/lib/api/role'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'
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

type TextColumnKey = 'description' | 'createUserString' | 'createTime' | 'updateUserString' | 'updateTime'

function textColumn(key: TextColumnKey, header: string, className?: string): ColumnDef<DataTableFeatures, RoleResp> {
  return {
    accessorKey: key,
    header,
    cell: ({ row }) => <span className={className}>{row.original[key] || EMPTY_PLACEHOLDER}</span>
  }
}

function RowActions({ role, onAction }: { role: RoleResp; onAction: (action: RoleAction, role: RoleResp) => void }) {
  const isSystem = Boolean(role.isSystem)

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger render={<DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />} />}>
          <MoreHorizontal />
        </TooltipTrigger>
        <TooltipContent side="top">更多操作</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuGroup>
          <DropdownMenuItem disabled={isSystem} onClick={() => onAction('edit', role)}>
            <PenLine />
            修改角色
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction('permission', role)}>
            <KeyRound />
            功能权限
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction('members', role)}>
            <Users />
            关联用户
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={isSystem} onClick={() => onAction('delete', role)}>
          <Trash2 />
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Builds the role table columns; `rowOffset` keeps the serial number continuous across pages.
 */
export function createRoleColumns(
  onAction: (action: RoleAction, role: RoleResp) => void,
  rowOffset: number
): ColumnDef<DataTableFeatures, RoleResp>[] {
  return [
    {
      id: 'index',
      header: '序号',
      enableHiding: false,
      cell: ({ row }) => <span className="tabular-nums">{rowOffset + row.index + 1}</span>
    },
    {
      accessorKey: 'name',
      header: '角色名称',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span>{row.original.name}</span>
          <FlagBadge active={row.original.isSystem} activeLabel="内置" icon={<ShieldCheck />} />
        </div>
      )
    },
    {
      accessorKey: 'code',
      header: '角色编码',
      cell: ({ row }) => <span>{row.original.code}</span>
    },
    {
      accessorKey: 'dataScope',
      header: '数据权限',
      cell: ({ row }) => <DataScopeBadge scope={row.original.dataScope} />
    },
    {
      accessorKey: 'sort',
      header: '排序',
      cell: ({ row }) => <span className="tabular-nums">{row.original.sort}</span>
    },
    textColumn('description', '描述', 'inline-block max-w-50 truncate'),
    textColumn('createUserString', '创建人'),
    textColumn('createTime', '创建时间', 'tabular-nums'),
    textColumn('updateUserString', '修改人'),
    textColumn('updateTime', '修改时间', 'tabular-nums'),
    {
      id: 'actions',
      header: '操作',
      enableHiding: false,
      cell: ({ row }) => <RowActions role={row.original} onAction={onAction} />
    }
  ]
}
