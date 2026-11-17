import { Children } from 'react'
import type { ColumnDef, RowData } from '@tanstack/react-table'
import { ChevronRight } from 'lucide-react'
import { cn } from 'cn'

import type { ValueType } from '@/components/table/columns'
import type { DataTableFeatures } from '@/lib/data-table-features'
import { getColumnKey, getColumnTitle, isFieldColumn } from '../column-utils'
import { ProField } from '../field/pro-field'
import type { ActionType, ProColumns, ProFieldColumn } from '../typing'

function skeletonType<T>(column: ProFieldColumn<T>): ValueType {
  if (column.valueType === 'index' || column.valueType === 'option') return column.valueType
  if (column.valueType === 'dateTime' || column.valueType === 'dateRange' || column.valueType === 'dateTimeRange') return 'dateTime'
  if (column.valueEnum || column.valueType === 'switch') return 'status'
  return 'text'
}

export function genProColumnToColumn<T extends RowData>(
  columns: readonly ProColumns<T>[],
  { action, rowOffset = 0, emptyText, expandable = false }: {
    action?: ActionType
    rowOffset?: number
    emptyText?: string
    expandable?: boolean
  }
): ColumnDef<DataTableFeatures, T>[] {
  return columns.flatMap((column, index): ColumnDef<DataTableFeatures, T>[] => {
    if (!isFieldColumn(column) || column.hideInTable) return []
    const id = getColumnKey(column, index)
    const type = skeletonType(column)
    const align = column.align ?? (type === 'index' || type === 'option' ? 'center' : 'left')
    const textAlign = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
    const justify = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
    return [{
      id,
      ...(column.dataIndex ? { accessorFn: (record: T) => record[column.dataIndex!] } : {}),
      header: () => <div className={textAlign}>{getColumnTitle(column, 'table')}</div>,
      enableHiding: type !== 'index' && type !== 'option',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { valueType: type, hideInSetting: column.hideInSetting },
      cell: ({ row }) => {
        const rowIndex = rowOffset + row.index
        const raw = column.valueType === 'index' ? rowIndex : column.dataIndex ? row.original[column.dataIndex] : undefined
        const value = column.renderText ? column.renderText(raw, row.original, row.index, action) : raw
        const dom = <ProField column={column} value={value} entity={row.original} type="table" emptyText={emptyText} />
        const rendered = column.render ? column.render(dom, row.original, row.index, action, { ...column, type: 'table', entity: row.original }) : dom
        const content = column.valueType === 'option' && Array.isArray(rendered)
          ? <div className={cn('flex items-center gap-2', justify)}>{Children.toArray(rendered)}</div>
          : rendered
        const isTreeColumn = expandable && column.valueType !== 'index' && column.valueType !== 'option' &&
          row.getVisibleCells().find(cell => cell.column.columnDef.meta?.valueType !== 'index' && cell.column.columnDef.meta?.valueType !== 'option')?.column.id === id
        if (!isTreeColumn) return <div className={textAlign}>{content}</div>
        return (
          <div className={cn('flex items-center gap-1', textAlign, justify)} style={{ paddingLeft: row.depth * 20 }}>
            {row.getCanExpand() ? (
              <button
                type="button"
                className="flex size-6 shrink-0 items-center justify-center rounded hover:bg-muted"
                aria-label={row.getIsExpanded() ? '收起子级' : '展开子级'}
                aria-expanded={row.getIsExpanded()}
                onClick={row.getToggleExpandedHandler()}
              >
                <ChevronRight className={cn('size-4 transition-transform', row.getIsExpanded() && 'rotate-90')} />
              </button>
            ) : <span className="size-6 shrink-0" />}
            <div className="min-w-0">{content}</div>
          </div>
        )
      }
    }]
  })
}
