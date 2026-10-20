import type { ReactTable } from '@tanstack/react-table'
import type { DateRange } from 'react-day-picker'

import { Download, Maximize, Minimize, RefreshCw, RotateCcw, SlidersHorizontal } from 'lucide-react'

import { DateRangeFilter } from '@/components/date-range-filter'
import { TableSearch } from '@/components/table-search'
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import type { LogResp, LogStatus } from '@/lib/api/log'
import type { DataTableFeatures } from '@/lib/data-table-features'

import { LOG_COLUMN_LABELS } from './log-columns'

const STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: '1', label: '成功' },
  { value: '2', label: '失败' }
]

interface LogToolbarProps {
  readonly table: ReactTable<DataTableFeatures, LogResp>
  readonly isRefreshing: boolean
  readonly isExporting: boolean
  readonly isFullscreen: boolean
  readonly canExport: boolean
  /** Remounts the two search boxes, which is how a reset clears their text. */
  readonly searchVersion: number
  readonly operatorPlaceholder: string
  readonly ipPlaceholder: string
  readonly datePlaceholder: string
  readonly createTime: DateRange | undefined
  readonly status: LogStatus | undefined
  readonly onOperatorSearch: (value: string) => void
  readonly onIpSearch: (value: string) => void
  readonly onCreateTimeChange: (value: DateRange | undefined) => void
  readonly onStatusChange: (value: string | null) => void
  readonly onReset: () => void
  readonly onExport: () => void
  readonly onRefresh: () => void
  readonly onToggleFullscreen: () => void
  readonly onResetColumns: () => void
}

/** Filters on the left, table tools on the right. */
export function LogToolbar({
  table,
  isRefreshing,
  isExporting,
  isFullscreen,
  canExport,
  searchVersion,
  operatorPlaceholder,
  ipPlaceholder,
  datePlaceholder,
  createTime,
  status,
  onOperatorSearch,
  onIpSearch,
  onCreateTimeChange,
  onStatusChange,
  onReset,
  onExport,
  onRefresh,
  onToggleFullscreen,
  onResetColumns
}: LogToolbarProps) {
  const hideableColumns = table.getAllColumns().filter(column => column.getCanHide())

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4">
      <div className="flex flex-wrap items-center gap-2">
        <TableSearch
          key={`operator-${searchVersion}`}
          clearable
          placeholder={operatorPlaceholder}
          onSearch={onOperatorSearch}
          className="md:w-52"
        />
        <TableSearch
          key={`ip-${searchVersion}`}
          clearable
          placeholder={ipPlaceholder}
          onSearch={onIpSearch}
          className="md:w-56"
        />
        <DateRangeFilter value={createTime} onChange={onCreateTimeChange} placeholder={datePlaceholder} />
        <Select
          items={STATUS_OPTIONS}
          value={status === undefined ? 'all' : String(status)}
          onValueChange={onStatusChange}
        >
          <SelectTrigger size="sm">
            <span className="text-muted-foreground">状态</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectGroup>
              {STATUS_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={onReset}>
          <RotateCcw />
          重置
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canExport ? (
          <Button size="sm" variant="outline" disabled={isExporting} onClick={onExport}>
            {isExporting ? <Spinner /> : <Download />}
            导出
          </Button>
        ) : null}
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
                    : (LOG_COLUMN_LABELS[column.id] ?? column.id)

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
    </div>
  )
}
