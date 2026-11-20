import type { ComponentProps, ReactNode } from 'react'

import type { ReactTable, RowData } from '@tanstack/react-table'
import { cn } from 'cn'
import { Maximize, Minimize, RefreshCw } from 'lucide-react'

import { TableColumnSetting } from '@/components/table-column-setting'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import type { DataTableFeatures } from '@/lib/data-table-features'

interface TableToolbarProps<TRow extends RowData> {
  readonly table: ReactTable<DataTableFeatures, TRow>
  readonly actions?: ReactNode
  readonly isRefreshing: boolean
  readonly isFullscreen: boolean
  readonly onRefresh: () => void
  readonly onToggleFullscreen: () => void
  readonly columnSetting: Omit<ComponentProps<typeof TableColumnSetting>, 'table' | 'labels'>
  readonly className?: string
  /** Labels for columns whose header renders a node, which the settings panel cannot read. */
  readonly columnLabels?: Record<string, ReactNode>
  /** Omitted flags preserve the controls shown by existing table screens. */
  readonly options?: false | { reload?: boolean; setting?: boolean; fullScreen?: boolean }
}

/** Shared refresh, column settings and fullscreen controls for list tables. */
export function TableToolbar<TRow extends RowData>({
  table,
  actions,
  isRefreshing,
  isFullscreen,
  onRefresh,
  onToggleFullscreen,
  columnSetting,
  className,
  columnLabels,
  options
}: TableToolbarProps<TRow>) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {actions}

      {options !== false && options?.reload !== false ? (
        <Button variant="outline" size="icon" disabled={isRefreshing} onClick={onRefresh} aria-label="刷新">
          {isRefreshing ? <Spinner /> : <RefreshCw />}
        </Button>
      ) : null}

      {options !== false && options?.setting !== false ? (
        <TableColumnSetting table={table} labels={columnLabels} {...columnSetting} />
      ) : null}

      {options !== false && options?.fullScreen !== false ? (
        <Button
          variant="outline"
          onClick={onToggleFullscreen}
          size="icon"
          aria-label={isFullscreen ? '退出全屏' : '全屏'}
        >
          {isFullscreen ? <Minimize /> : <Maximize />}
        </Button>
      ) : null}
    </div>
  )
}
