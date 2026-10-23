import type { ReactTable } from '@tanstack/react-table'

import { Download, Maximize, Minimize, RefreshCw, RotateCcw, SlidersHorizontal } from 'lucide-react'

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
import type { SmsLogResp, SmsLogStatus } from '@/lib/api/sms-log'
import type { DataTableFeatures } from '@/lib/data-table-features'

const STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: '1', label: '成功' },
  { value: '2', label: '失败' }
]

/** The hide-columns menu reads `columnDef.header`, which cannot hold the centered node. */
const COLUMN_LABELS: Record<string, string> = {
  status: '发送状态'
}

interface SmsLogFiltersProps {
  /** Remounts the two search boxes, which is how a reset clears their text. */
  readonly searchVersion: number
  readonly status: SmsLogStatus | undefined
  readonly onConfigIdSearch: (value: string) => void
  readonly onPhoneSearch: (value: string) => void
  readonly onStatusChange: (value: string | null) => void
  readonly onReset: () => void
}

/** The log filters, rendered in the list's filter row. */
export function SmsLogFilters({
  searchVersion,
  status,
  onConfigIdSearch,
  onPhoneSearch,
  onStatusChange,
  onReset
}: SmsLogFiltersProps) {
  return (
    <>
      <TableSearch
        key={`config-${searchVersion}`}
        clearable
        className="h-8 w-full sm:w-44"
        placeholder="搜索配置 ID"
        onSearch={onConfigIdSearch}
      />
      <TableSearch
        key={`phone-${searchVersion}`}
        clearable
        className="h-8 w-full sm:w-48"
        placeholder="搜索手机号"
        onSearch={onPhoneSearch}
      />
      <div className="w-full sm:w-32">
        <Select
          items={STATUS_OPTIONS}
          value={status === undefined ? 'all' : String(status)}
          onValueChange={onStatusChange}
        >
          <SelectTrigger className="w-full">
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
      </div>
      <Button type="button" variant="outline" onClick={onReset}>
        <RotateCcw />
        重置
      </Button>
    </>
  )
}

interface SmsLogToolbarProps {
  readonly table: ReactTable<DataTableFeatures, SmsLogResp>
  readonly isRefreshing: boolean
  readonly isExporting: boolean
  readonly isFullscreen: boolean
  readonly canExport: boolean
  readonly onExport: () => void
  readonly onRefresh: () => void
  readonly onToggleFullscreen: () => void
  readonly onResetColumns: () => void
}

/** The table tools, rendered on the right of the filter row. */
export function SmsLogToolbar({
  table,
  isRefreshing,
  isExporting,
  isFullscreen,
  canExport,
  onExport,
  onRefresh,
  onToggleFullscreen,
  onResetColumns
}: SmsLogToolbarProps) {
  const hideableColumns = table.getAllColumns().filter(column => column.getCanHide())

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canExport ? (
        <Button variant="outline" disabled={isExporting} onClick={onExport}>
          {isExporting ? <Spinner /> : <Download />}
          导出
        </Button>
      ) : null}
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

      <Button variant="outline" onClick={onToggleFullscreen}>
        {isFullscreen ? <Minimize /> : <Maximize />}
        表格全屏
      </Button>
    </div>
  )
}
