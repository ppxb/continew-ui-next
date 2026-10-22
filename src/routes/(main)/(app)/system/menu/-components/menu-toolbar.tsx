import type { ReactTable } from '@tanstack/react-table'

import {
  ChevronsDownUp,
  ChevronsUpDown,
  Maximize,
  Minimize,
  Plus,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Trash2
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import type { MenuResp } from '@/lib/api/menu'
import type { DataTableFeatures } from '@/lib/data-table-features'

interface MenuToolbarProps {
  readonly table: ReactTable<DataTableFeatures, MenuResp>
  readonly isRefreshing: boolean
  readonly isFullscreen: boolean
  readonly isAllExpanded: boolean
  readonly isClearingCache: boolean
  readonly hasCreatePermission: boolean
  readonly hasClearCachePermission: boolean
  readonly onCreate: () => void
  readonly onRefresh: () => void
  readonly onToggleExpandAll: () => void
  readonly onClearCache: () => void
  readonly onToggleFullscreen: () => void
  readonly onResetColumns: () => void
}

const COLUMN_LABEL_MAP: Record<string, string> = {
  title: '菜单名称',
  type: '类型',
  path: '路由地址',
  name: '组件名称',
  component: '组件路径',
  permission: '权限标识',
  sort: '排序',
  status: '状态',
  isHidden: '隐藏',
  isExternal: '外链',
  isCache: '缓存'
}

export function MenuToolbar({
  table,
  isRefreshing,
  isFullscreen,
  isAllExpanded,
  isClearingCache,
  hasCreatePermission,
  hasClearCachePermission,
  onCreate,
  onRefresh,
  onToggleExpandAll,
  onClearCache,
  onToggleFullscreen,
  onResetColumns
}: MenuToolbarProps) {
  const hideableColumns = table.getAllColumns().filter(column => column.getCanHide())

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Left actions */}
      <div className="flex flex-wrap items-center gap-2">
        {hasCreatePermission && (
          <Button onClick={onCreate}>
            <Plus />
            新增菜单
          </Button>
        )}

        {hasClearCachePermission && (
          <Button
            variant="outline"
            disabled={isClearingCache}
            onClick={onClearCache}
            className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
          >
            {isClearingCache ? <Spinner /> : <Trash2 />}
            清除缓存
          </Button>
        )}
      </div>

      {/* Right actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={onToggleExpandAll}>
          {isAllExpanded ? <ChevronsDownUp /> : <ChevronsUpDown />}
          {isAllExpanded ? '折叠全部' : '展开全部'}
        </Button>

        <Button variant="outline" disabled={isRefreshing} onClick={onRefresh}>
          {isRefreshing ? <Spinner /> : <RefreshCw />}
          刷新
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            <SlidersHorizontal />
            隐藏列
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuGroup>
              <DropdownMenuLabel>显示的列</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {hideableColumns.map(column => {
                const label =
                  COLUMN_LABEL_MAP[column.id] ||
                  (typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id)

                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={value => column.toggleVisibility(value)}
                  >
                    {label}
                  </DropdownMenuCheckboxItem>
                )
              })}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onResetColumns}>
              <RotateCcw />
              重置
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" onClick={onToggleFullscreen}>
          {isFullscreen ? <Minimize /> : <Maximize />}
          表格全屏
        </Button>
      </div>
    </div>
  )
}
