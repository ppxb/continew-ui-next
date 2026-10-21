import type { ColumnDef } from '@tanstack/react-table'

import { Building2, ChevronRight, MoreHorizontal, PenLine, Plus, Trash2 } from 'lucide-react'

import { FlagBadge } from '@/components/data-badge'
import { StatusCell } from '@/components/status-cell'
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
import type { DeptResp } from '@/lib/api/dept'
import type { DataTableFeatures } from '@/lib/data-table-features'
import { cn } from 'cn'

export type DeptAction = 'edit' | 'add-child' | 'delete'

function RowActions({
  dept,
  onAction,
  hasCreatePermission,
  hasUpdatePermission,
  hasDeletePermission
}: {
  dept: DeptResp
  onAction: (action: DeptAction, dept: DeptResp) => void
  hasCreatePermission: boolean
  hasUpdatePermission: boolean
  hasDeletePermission: boolean
}) {
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
            {hasUpdatePermission && (
              <DropdownMenuItem onClick={() => onAction('edit', dept)}>
                <PenLine />
                修改部门
              </DropdownMenuItem>
            )}
            {hasCreatePermission && (
              <DropdownMenuItem onClick={() => onAction('add-child', dept)}>
                <Plus />
                添加下级
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          {hasDeletePermission && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  variant="destructive"
                  disabled={dept.isSystem}
                  onClick={() => onAction('delete', dept)}
                >
                  <Trash2 />
                  {dept.isSystem ? '内置部门' : '删除'}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

interface CreateDeptColumnsOptions {
  onAction: (action: DeptAction, dept: DeptResp) => void
  hasUpdatePermission: boolean
  hasCreatePermission: boolean
  hasDeletePermission: boolean
}

export function createDeptColumns({
  onAction,
  hasUpdatePermission,
  hasCreatePermission,
  hasDeletePermission
}: CreateDeptColumnsOptions): ColumnDef<DataTableFeatures, DeptResp>[] {
  return [
    {
      accessorKey: 'name',
      header: '部门名称',
      enableHiding: false,
      cell: ({ row }) => {
        const dept = row.original
        const canExpand = row.getCanExpand()
        const isExpanded = row.getIsExpanded()
        const depth = row.depth

        return (
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 24}px` }}>
            {canExpand ? (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  row.toggleExpanded()
                }}
                className="flex size-5 shrink-0 items-center justify-center rounded-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={isExpanded ? '折叠' : '展开'}
              >
                <ChevronRight
                  className={cn('size-4 transition-transform duration-200', isExpanded && 'rotate-90 text-foreground')}
                />
              </button>
            ) : (
              <span className="size-5 shrink-0" />
            )}

            <Building2 className="size-4 shrink-0 text-muted-foreground" />

            <span className={cn('truncate text-sm', depth === 0 ? 'font-medium text-foreground' : 'text-foreground')}>
              {dept.name}
            </span>
          </div>
        )
      }
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => <StatusCell status={row.original.status} />
    },
    {
      accessorKey: 'sort',
      header: '排序',
      cell: ({ row }) => <span className="text-sm text-muted-foreground tabular-nums">{row.original.sort}</span>
    },
    {
      accessorKey: 'isSystem',
      header: '系统内置',
      cell: ({ row }) => <FlagBadge active={row.original.isSystem} activeLabel="内置" inactiveLabel="自定义" />
    },
    {
      accessorKey: 'description',
      header: '描述',
      cell: ({ row }) => (
        <span className="truncate text-sm text-muted-foreground">{row.original.description || '-'}</span>
      )
    },
    {
      accessorKey: 'createUserString',
      header: '创建人',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.createUserString || '-'}</span>
    },
    {
      accessorKey: 'createTime',
      header: '创建时间',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.createTime || '-'}</span>
    },
    {
      accessorKey: 'updateUserString',
      header: '修改人',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.updateUserString || '-'}</span>
    },
    {
      accessorKey: 'updateTime',
      header: '修改时间',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.updateTime || '-'}</span>
    },
    {
      id: 'actions',
      header: () => <div className="text-center">操作</div>,
      enableHiding: false,
      cell: ({ row }) => (
        <RowActions
          dept={row.original}
          onAction={onAction}
          hasCreatePermission={hasCreatePermission}
          hasUpdatePermission={hasUpdatePermission}
          hasDeletePermission={hasDeletePermission}
        />
      )
    }
  ]
}
