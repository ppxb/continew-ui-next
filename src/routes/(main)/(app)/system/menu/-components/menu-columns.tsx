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
import { cn } from 'cn'

export type MenuAction = 'edit' | 'add-child' | 'delete'

function MenuTypeBadge({ type }: { type: MenuType }) {
  if (type === 1) {
    return (
      <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300">
        目录
      </Badge>
    )
  }

  if (type === 2) {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      >
        菜单
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300">
      按钮
    </Badge>
  )
}

function StatusIndicator({ status }: { status: number }) {
  const isEnabled = status === 1

  return (
    <div className="inline-flex items-center gap-1.5 text-xs">
      <span
        className={cn(
          'size-1.5 shrink-0 rounded-full',
          isEnabled ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]' : 'bg-muted-foreground/40'
        )}
      />
      <span className={isEnabled ? 'text-foreground' : 'text-muted-foreground'}>{isEnabled ? '启用' : '禁用'}</span>
    </div>
  )
}

function BooleanTag({ value }: { value?: boolean }) {
  if (!value) {
    return <span className="text-sm text-muted-foreground/50">否</span>
  }

  return (
    <Badge variant="secondary" className="font-normal">
      是
    </Badge>
  )
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

            <Icon className="size-4 shrink-0 text-muted-foreground" />

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
      header: () => <div className="text-center">类型</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <MenuTypeBadge type={row.original.type} />
        </div>
      )
    },
    {
      accessorKey: 'path',
      header: '路由地址',
      cell: ({ row }) => <span className="font-mono text-sm text-muted-foreground">{row.original.path || '-'}</span>
    },
    {
      accessorKey: 'component',
      header: '组件路径',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground">{row.original.component || '-'}</span>
      )
    },
    {
      accessorKey: 'permission',
      header: '权限标识',
      cell: ({ row }) =>
        row.original.permission ? (
          <Badge variant="secondary" className="font-mono text-xs">
            {row.original.permission}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )
    },
    {
      accessorKey: 'sort',
      header: () => <div className="text-center">排序</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <span className="text-sm text-muted-foreground tabular-nums">{row.original.sort}</span>
        </div>
      )
    },
    {
      accessorKey: 'status',
      header: () => <div className="text-center">状态</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <StatusIndicator status={row.original.status} />
        </div>
      )
    },
    {
      accessorKey: 'isHidden',
      header: () => <div className="text-center">隐藏</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <BooleanTag value={row.original.isHidden} />
        </div>
      )
    },
    {
      accessorKey: 'isExternal',
      header: () => <div className="text-center">外链</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <BooleanTag value={row.original.isExternal} />
        </div>
      )
    },
    {
      accessorKey: 'isCache',
      header: () => <div className="text-center">缓存</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <BooleanTag value={row.original.isCache} />
        </div>
      )
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
