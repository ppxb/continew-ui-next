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
      <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-[11px] text-sky-700 dark:text-sky-300">
        目录
      </Badge>
    )
  }

  if (type === 2) {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/30 bg-emerald-500/10 text-[11px] text-emerald-700 dark:text-emerald-300"
      >
        菜单
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className="border-purple-500/30 bg-purple-500/10 text-[11px] text-purple-700 dark:text-purple-300"
    >
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
    return <span className="text-xs text-muted-foreground/50">否</span>
  }

  return (
    <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal text-primary">
      是
    </Badge>
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
      id: 'title',
      accessorKey: 'title',
      header: '菜单名称',
      size: 260,
      cell: ({ row }) => {
        const menu = row.original
        const canExpand = row.getCanExpand()
        const isExpanded = row.getIsExpanded()
        const depth = row.depth
        const Icon = menu.icon ? resolveMenuIcon(menu.icon) : Folder

        return (
          <div className="flex items-center gap-1.5" style={{ paddingLeft: `${depth * 20}px` }}>
            {/* Tree expansion arrow */}
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
                  className={cn(
                    'size-3.5 transition-transform duration-200',
                    isExpanded && 'rotate-90 text-foreground'
                  )}
                />
              </button>
            ) : (
              <span className="size-5 shrink-0" />
            )}

            {/* Menu icon */}
            <Icon className="size-3.5 shrink-0 text-muted-foreground" />

            {/* Title */}
            <span
              className={cn(
                'truncate text-xs',
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
      id: 'type',
      accessorKey: 'type',
      header: '类型',
      size: 80,
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <MenuTypeBadge type={row.original.type} />
        </div>
      )
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: '状态',
      size: 80,
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <StatusIndicator status={row.original.status} />
        </div>
      )
    },
    {
      id: 'path',
      accessorKey: 'path',
      header: '路由地址',
      size: 160,
      cell: ({ row }) => (
        <span className="truncate font-mono text-xs text-muted-foreground">{row.original.path || '-'}</span>
      )
    },
    {
      id: 'permission',
      accessorKey: 'permission',
      header: '权限标识',
      size: 160,
      cell: ({ row }) => {
        const code = row.original.permission
        if (!code) return <span className="text-muted-foreground">-</span>

        return (
          <Badge variant="outline" className="border-border/70 font-mono text-[11px] font-normal">
            {code}
          </Badge>
        )
      }
    },
    {
      id: 'component',
      accessorKey: 'component',
      header: '组件路径',
      size: 170,
      cell: ({ row }) => (
        <span className="truncate font-mono text-xs text-muted-foreground" title={row.original.component ?? ''}>
          {row.original.component || '-'}
        </span>
      )
    },
    {
      id: 'sort',
      accessorKey: 'sort',
      header: '排序',
      size: 60,
      cell: ({ row }) => <span className="flex justify-center text-xs text-muted-foreground">{row.original.sort}</span>
    },
    {
      id: 'isHidden',
      accessorKey: 'isHidden',
      header: '隐藏',
      size: 60,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <BooleanTag value={row.original.isHidden} />
        </div>
      )
    },
    {
      id: 'isExternal',
      accessorKey: 'isExternal',
      header: '外链',
      size: 60,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <BooleanTag value={row.original.isExternal} />
        </div>
      )
    },
    {
      id: 'isCache',
      accessorKey: 'isCache',
      header: '缓存',
      size: 60,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <BooleanTag value={row.original.isCache} />
        </div>
      )
    },
    {
      id: 'actions',
      header: '操作',
      size: 130,
      cell: ({ row }) => {
        const menu = row.original
        const canAddChild = menu.type === 1 || menu.type === 2

        return (
          <div className="flex items-center justify-center gap-1">
            {/* Inline Quick Action: Add child */}
            {hasCreatePermission && canAddChild && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="新增子级菜单"
                      onClick={() => onAction('add-child', menu)}
                    />
                  }
                >
                  <Plus className="size-3.5 text-muted-foreground hover:text-foreground" />
                </TooltipTrigger>
                <TooltipContent side="top">新增下级</TooltipContent>
              </Tooltip>
            )}

            {/* Inline Quick Action: Edit */}
            {hasUpdatePermission && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="修改菜单"
                      onClick={() => onAction('edit', menu)}
                    />
                  }
                >
                  <PenLine className="size-3.5 text-muted-foreground hover:text-foreground" />
                </TooltipTrigger>
                <TooltipContent side="top">修改</TooltipContent>
              </Tooltip>
            )}

            {/* Dropdown Menu for more actions */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label="更多操作" />} />
                  }
                >
                  <MoreHorizontal className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent side="top">更多</TooltipContent>
              </Tooltip>

              <DropdownMenuContent align="end" className="min-w-32 text-xs">
                <DropdownMenuGroup>
                  {hasUpdatePermission && (
                    <DropdownMenuItem onClick={() => onAction('edit', menu)}>
                      <PenLine className="mr-2 size-3.5" />
                      修改菜单
                    </DropdownMenuItem>
                  )}
                  {hasCreatePermission && canAddChild && (
                    <DropdownMenuItem onClick={() => onAction('add-child', menu)}>
                      <Plus className="mr-2 size-3.5" />
                      添加下级菜单
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>

                {hasDeletePermission && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onAction('delete', menu)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 size-3.5" />
                      删除菜单
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      }
    }
  ]
}
