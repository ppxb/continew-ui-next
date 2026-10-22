import type { ReactTable } from '@tanstack/react-table'

import {
  ChevronsDownUp,
  ChevronsUpDown,
  Download,
  Maximize,
  Minimize,
  Plus,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal
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
import type { DeptResp } from '@/lib/api/dept'
import type { DataTableFeatures } from '@/lib/data-table-features'

interface DeptToolbarProps {
  readonly table: ReactTable<DataTableFeatures, DeptResp>
  readonly isRefreshing: boolean
  readonly isExporting: boolean
  readonly isFullscreen: boolean
  readonly isAllExpanded: boolean
  readonly hasCreatePermission: boolean
  readonly hasExportPermission: boolean
  readonly onCreate: () => void
  readonly onExport: () => void
  readonly onRefresh: () => void
  readonly onToggleExpandAll: () => void
  readonly onToggleFullscreen: () => void
  readonly onResetColumns: () => void
}

const COLUMN_LABEL_MAP: Record<string, string> = {
  name: '部门名称',
  status: '状态',
  sort: '排序',
  isSystem: '系统内置',
  description: '描述',
  createUserString: '创建人',
  createTime: '创建时间',
  updateUserString: '修改人',
  updateTime: '修改时间'
}

export function DeptToolbar({
  table,
  isRefreshing,
  isExporting,
  isFullscreen,
  isAllExpanded,
  hasCreatePermission,
  hasExportPermission,
  onCreate,
  onExport,
  onRefresh,
  onToggleExpandAll,
  onToggleFullscreen,
  onResetColumns
}: DeptToolbarProps) {
  const hideableColumns = table.getAllColumns().filter(column => column.getCanHide())

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasCreatePermission ? (
        <Button onClick={onCreate}>
          <Plus />
          新增部门
        </Button>
      ) : null}

      {hasExportPermission ? (
        <Button variant="outline" disabled={isExporting} onClick={onExport}>
          {isExporting ? <Spinner /> : <Download />}
          导出
        </Button>
      ) : null}

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
              const label = COLUMN_LABEL_MAP[column.id] ?? column.id

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
  )
}
