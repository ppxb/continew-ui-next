import type { ColumnDef } from '@tanstack/react-table'

import { MoreHorizontal, ShieldCheck, Users, KeyRound, Edit, Trash2 } from 'lucide-react'

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
import { DATA_SCOPE_MAP, type RoleResp } from '@/lib/api/role'
import type { DataTableFeatures } from '@/lib/data-table-features'

export type RoleAction = 'edit' | 'permission' | 'members' | 'delete'

function DataScopeBadge({ scope }: { scope: RoleResp['dataScope'] }) {
  const label = DATA_SCOPE_MAP[scope] ?? '未知'

  if (scope === 1) {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      >
        {label}
      </Badge>
    )
  }

  if (scope === 5) {
    return (
      <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400">
        {label}
      </Badge>
    )
  }

  return (
    <Badge variant="secondary" className="font-normal">
      {label}
    </Badge>
  )
}

function RowActions({ role, onAction }: { role: RoleResp; onAction: (action: RoleAction, role: RoleResp) => void }) {
  const isSystem = Boolean(role.isSystem)

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
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuGroup>
            <DropdownMenuItem disabled={isSystem} onClick={() => onAction('edit', role)}>
              <Edit className="mr-1 size-4 text-muted-foreground" />
              修改
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('permission', role)}>
              <KeyRound className="mr-1 size-4 text-muted-foreground" />
              功能权限
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('members', role)}>
              <Users className="mr-1 size-4 text-muted-foreground" />
              关联用户
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive" disabled={isSystem} onClick={() => onAction('delete', role)}>
              <Trash2 className="mr-1 size-4" />
              删除
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function createRoleColumns(
  onAction: (action: RoleAction, role: RoleResp) => void,
  rowOffset: number
): ColumnDef<DataTableFeatures, RoleResp>[] {
  return [
    {
      id: 'index',
      header: '序号',
      enableHiding: false,
      cell: ({ row }) => <span className="text-sm text-muted-foreground tabular-nums">{rowOffset + row.index + 1}</span>
    },
    {
      accessorKey: 'name',
      header: '角色名称',
      cell: ({ row }) => {
        const isSystem = row.original.isSystem
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{row.original.name}</span>
            {isSystem && (
              <Badge variant="outline">
                <ShieldCheck />
                内置
              </Badge>
            )}
          </div>
        )
      }
    },
    {
      accessorKey: 'code',
      header: '角色编码',
      cell: ({ row }) => <Badge variant="secondary">{row.original.code}</Badge>
    },
    {
      accessorKey: 'dataScope',
      header: '数据权限',
      cell: ({ row }) => <DataScopeBadge scope={row.original.dataScope} />
    },
    {
      accessorKey: 'sort',
      header: '排序',
      cell: ({ row }) => <span className="text-sm text-muted-foreground tabular-nums">{row.original.sort}</span>
    },
    {
      accessorKey: 'description',
      header: '描述',
      cell: ({ row }) => (
        <span className="inline-block max-w-50 truncate text-sm text-muted-foreground">
          {row.original.description || '-'}
        </span>
      )
    },
    {
      accessorKey: 'createUserString',
      header: '创建人',
      cell: ({ row }) => <span className="text-sm">{row.original.createUserString || '-'}</span>
    },
    {
      accessorKey: 'createTime',
      header: '创建时间',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground tabular-nums">{row.original.createTime || '-'}</span>
      )
    },
    {
      accessorKey: 'updateUserString',
      header: '修改人',
      cell: ({ row }) => <span className="text-sm">{row.original.updateUserString || '-'}</span>
    },
    {
      accessorKey: 'updateTime',
      header: '修改时间',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground tabular-nums">{row.original.updateTime || '-'}</span>
      )
    },
    {
      id: 'actions',
      header: () => <div className="text-center">操作</div>,
      enableHiding: false,
      cell: ({ row }) => <RowActions role={row.original} onAction={onAction} />
    }
  ]
}
