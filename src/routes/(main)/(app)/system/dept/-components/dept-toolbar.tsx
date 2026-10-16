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
    <div className="flex flex-wrap items-center justify-between gap-3 px-4">
      {/* Left actions */}
      <div className="flex flex-wrap items-center gap-2">
        {hasCreatePermission && (
          <Button size="sm" onClick={onCreate} className="inline-flex items-center justify-center gap-1.5">
            <Plus className="size-3.5 shrink-0" />
            <span className="leading-none">新增部门</span>
          </Button>
        )}

        {hasExportPermission && (
          <Button
            size="sm"
            variant="outline"
            disabled={isExporting}
            onClick={onExport}
            className="inline-flex items-center justify-center gap-1.5"
          >
            {isExporting ? <Spinner className="size-3.5" /> : <Download className="size-3.5" />}
            <span className="leading-none">导出</span>
          </Button>
        )}
      </div>

      {/* Right actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onToggleExpandAll}
          className="inline-flex items-center justify-center gap-1.5"
        >
          {isAllExpanded ? <ChevronsDownUp className="size-3.5" /> : <ChevronsUpDown className="size-3.5" />}
          <span className="leading-none">{isAllExpanded ? '折叠全部' : '展开全部'}</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          disabled={isRefreshing}
          onClick={onRefresh}
          className="inline-flex items-center justify-center gap-1.5"
        >
          {isRefreshing ? <Spinner className="size-3.5" /> : <RefreshCw className="size-3.5" />}
          <span className="leading-none">刷新</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button size="sm" variant="outline" className="inline-flex items-center justify-center gap-1.5" />}
          >
            <SlidersHorizontal className="size-3.5" />
            <span className="leading-none">隐藏列</span>
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

        <Button
          size="sm"
          variant="outline"
          onClick={onToggleFullscreen}
          className="inline-flex items-center justify-center gap-1.5"
        >
          {isFullscreen ? <Minimize className="size-3.5" /> : <Maximize className="size-3.5" />}
          <span className="leading-none">表格全屏</span>
        </Button>
      </div>
    </div>
  )
}
