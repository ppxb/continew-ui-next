import type { ColumnDef } from '@tanstack/react-table'

import { ChevronRight, Folder, MoreHorizontal, PenLine, Plus, Trash2 } from 'lucide-react'

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
import type { MenuResp, MenuType } from '@/lib/api/menu'
import type { DataTableFeatures } from '@/lib/data-table-features'
import { resolveMenuIcon } from '@/navigation/sidebar/menu-icons'
import { StatusCell } from '@/routes/(main)/(app)/system/user/-components/user-display'
import { cn } from 'cn'

export type MenuAction = 'edit' | 'add-child' | 'delete'

function MenuTypeBadge({ type }: { type: MenuType }) {
  if (type === 1) {
    return <Badge className="bg-sky-500/10 font-normal text-sky-700 dark:text-sky-300">目录</Badge>
  }

  if (type === 2) {
    return <Badge className="bg-emerald-500/10 font-normal text-emerald-700 dark:text-emerald-300">菜单</Badge>
  }

  return <Badge className="bg-purple-500/10 font-normal text-purple-700 dark:text-purple-300">按钮</Badge>
}

function BooleanBadge({ value }: { value?: boolean }) {
  const isTrue = Boolean(value)

  if (isTrue) {
    return <Badge className="bg-emerald-500/10 font-normal text-emerald-600 dark:text-emerald-400">是</Badge>
  }

  return <Badge className="bg-destructive/10 font-normal text-destructive dark:text-destructive">否</Badge>
}

function RowActions({
  menu,
  onAction,
  hasCreatePermission,
  hasUpdatePermission,
  hasDeletePermission
}: {
  menu: MenuResp
  onAction: (action: MenuAction, menu: MenuResp) => void
  hasCreatePermission: boolean
  hasUpdatePermission: boolean
  hasDeletePermission: boolean
}) {
  const canAddChild = menu.type === 1 || menu.type === 2

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
              <DropdownMenuItem onClick={() => onAction('edit', menu)}>
                <PenLine />
                修改菜单
              </DropdownMenuItem>
            )}
            {hasCreatePermission && canAddChild && (
              <DropdownMenuItem onClick={() => onAction('add-child', menu)}>
                <Plus />
                添加下级
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          {hasDeletePermission && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive" onClick={() => onAction('delete', menu)}>
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

interface CreateMenuColumnsOptions {
  onAction: (action: MenuAction, menu: MenuResp) => void
  hasUpdatePermission: boolean
  hasCreatePermission: boolean
  hasDeletePermission: boolean
}

export function createMenuColumns({
  onAction,
  hasUpdatePermission,
  hasCreatePermission,
  hasDeletePermission
}: CreateMenuColumnsOptions): ColumnDef<DataTableFeatures, MenuResp>[] {
  return [
    {
      accessorKey: 'title',
      header: '菜单名称',
      enableHiding: false,
      cell: ({ row }) => {
        const menu = row.original
        const canExpand = row.getCanExpand()
        const isExpanded = row.getIsExpanded()
        const depth = row.depth
        const Icon = menu.icon ? resolveMenuIcon(menu.icon) : Folder

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

            {menu.type !== 3 && <Icon className="size-4 shrink-0 text-muted-foreground" />}

            <span
              className={cn(
                'truncate text-sm',
                menu.type === 1 && 'font-medium text-foreground',
                menu.type === 2 && 'text-foreground',
                menu.type === 3 && 'text-muted-foreground'
              )}
            >
              {menu.title}
            </span>
          </div>
        )
      }
    },
    {
      accessorKey: 'type',
      header: '类型',
      cell: ({ row }) => <MenuTypeBadge type={row.original.type} />
    },
    {
      accessorKey: 'path',
      header: '路由地址',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.path || '-'}</span>
    },
    {
      accessorKey: 'name',
      header: '组件名称',
      cell: ({ row }) => <span className="text-sm text-foreground">{row.original.name || '-'}</span>
    },
    {
      accessorKey: 'component',
      header: '组件路径',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.component || '-'}</span>
    },
    {
      accessorKey: 'permission',
      header: '权限标识',
      cell: ({ row }) =>
        row.original.permission ? (
          <Badge variant="secondary" className="font-normal">
            {row.original.permission}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )
    },
    {
      accessorKey: 'sort',
      header: '排序',
      cell: ({ row }) => <span className="text-sm text-muted-foreground tabular-nums">{row.original.sort}</span>
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => <StatusCell status={row.original.status} />
    },
    {
      accessorKey: 'isHidden',
      header: '隐藏',
      cell: ({ row }) => <BooleanBadge value={row.original.isHidden} />
    },
    {
      accessorKey: 'isExternal',
      header: '外链',
      cell: ({ row }) => <BooleanBadge value={row.original.isExternal} />
    },
    {
      accessorKey: 'isCache',
      header: '缓存',
      cell: ({ row }) => <BooleanBadge value={row.original.isCache} />
    },
    {
      id: 'actions',
      header: () => <div className="text-center">操作</div>,
      enableHiding: false,
      cell: ({ row }) => (
        <RowActions
          menu={row.original}
          onAction={onAction}
          hasCreatePermission={hasCreatePermission}
          hasUpdatePermission={hasUpdatePermission}
          hasDeletePermission={hasDeletePermission}
        />
      )
    }
  ]
}
