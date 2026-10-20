import type { ReactTable } from '@tanstack/react-table'

import { Maximize, Minimize, RefreshCw, RotateCcw, SlidersHorizontal } from 'lucide-react'

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
import type { JobLogResp } from '@/lib/api/job-log'
import type { DataTableFeatures } from '@/lib/data-table-features'

/** The hide-columns menu reads `columnDef.header`, which cannot hold the centered node. */
const COLUMN_LABELS: Record<string, string> = {
  taskBatchStatus: '执行状态',
  operationReason: '执行备注',
  actions: '操作'
}

interface JobLogToolbarProps {
  readonly table: ReactTable<DataTableFeatures, JobLogResp>
  readonly isRefreshing: boolean
  readonly isFullscreen: boolean
  readonly onRefresh: () => void
  readonly onToggleFullscreen: () => void
  readonly onResetColumns: () => void
}

/** The log screen has no create-style actions, so only its table tools sit on the right. */
export function JobLogToolbar({
  table,
  isRefreshing,
  isFullscreen,
  onRefresh,
  onToggleFullscreen,
  onResetColumns
}: JobLogToolbarProps) {
  const hideableColumns = table.getAllColumns().filter(column => column.getCanHide())

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 px-4">
      <Button size="sm" variant="outline" disabled={isRefreshing} onClick={onRefresh}>
        {isRefreshing ? <Spinner /> : <RefreshCw />}
        刷新
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button size="sm" variant="outline" />}>
          <SlidersHorizontal />
          隐藏列
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuLabel>显示的列</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {hideableColumns.map(column => {
              const label =
                typeof column.columnDef.header === 'string'
                  ? column.columnDef.header
                  : (COLUMN_LABELS[column.id] ?? column.id)

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

      <Button size="sm" variant="outline" onClick={onToggleFullscreen}>
        {isFullscreen ? <Minimize /> : <Maximize />}
        表格全屏
      </Button>
    </div>
  )
}
