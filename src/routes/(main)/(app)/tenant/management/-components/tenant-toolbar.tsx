import type { ReactTable } from '@tanstack/react-table'

import { Maximize, Minimize, Plus, RefreshCw, RotateCcw, SlidersHorizontal } from 'lucide-react'

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
import type { TenantResp } from '@/lib/api/tenant'
import type { DataTableFeatures } from '@/lib/data-table-features'

/** The hide-columns menu reads `columnDef.header`, which cannot hold the centered node. */
const COLUMN_LABELS: Record<string, string> = {
  status: '状态'
}

interface TenantToolbarProps {
  readonly table: ReactTable<DataTableFeatures, TenantResp>
  readonly isRefreshing: boolean
  readonly isFullscreen: boolean
  readonly canCreate: boolean
  readonly onCreate: () => void
  readonly onRefresh: () => void
  readonly onToggleFullscreen: () => void
  readonly onResetColumns: () => void
}

/** Actions on the left, table tools on the right, below the filters and the search. */
export function TenantToolbar({
  table,
  isRefreshing,
  isFullscreen,
  canCreate,
  onCreate,
  onRefresh,
  onToggleFullscreen,
  onResetColumns
}: TenantToolbarProps) {
  const hideableColumns = table.getAllColumns().filter(column => column.getCanHide())

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {canCreate ? (
          <Button onClick={onCreate}>
            <Plus />
            新增租户
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
    </div>
  )
}
