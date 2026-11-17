import type { ReactNode } from 'react'

import type { ColumnDef, RowData } from '@tanstack/react-table'

import { StatusCell } from '@/components/status-cell'
import { TextCell } from '@/components/text-cell'
import type { DataTableFeatures } from '@/lib/data-table-features'

/** How a column renders its value. `DataTable` also reads it to size the loading skeleton. */
export type ValueType = 'index' | 'text' | 'dateTime' | 'status' | 'option'

/** The skeleton width each value type imitates while the first page loads. */
export const VALUE_TYPE_SKELETON: Record<ValueType, string> = {
  index: 'mx-auto w-4',
  text: 'w-24',
  dateTime: 'w-32',
  status: 'w-12 rounded-full',
  option: 'mx-auto w-6'
}

declare module '@tanstack/react-table' {
  // The generics must match TanStack's declaration even though this meta does not use them.
  // oxlint-disable-next-line no-unused-vars
  interface ColumnMeta<TFeatures, TData extends RowData, TValue> {
    /** The value type the column was built with; `DataTable` reads it for the skeleton width. */
    valueType?: ValueType
    /** Excludes a data column from the visibility menu without changing its initial visibility. */
    hideInSetting?: boolean
  }
}

type AppColumn<TRow extends RowData> = ColumnDef<DataTableFeatures, TRow>

/** Keys of `TRow` whose values can render as text. */
type TextKey<TRow> = {
  [K in keyof TRow]: TRow[K] extends string | number | null | undefined ? K : never
}[keyof TRow] &
  string

/** The serial-number column; `rowOffset` keeps the numbers continuous across pages. */
export function indexColumn<TRow extends RowData>(rowOffset = 0): AppColumn<TRow> {
  return {
    id: 'index',
    header: '序号',
    enableHiding: false,
    meta: { valueType: 'index' },
    cell: ({ row }) => <div className="tabular-nums">{rowOffset + row.index + 1}</div>
  }
}

/** A plain text column; empty values show the shared placeholder and long values truncate. */
export function textColumn<TRow extends RowData>(key: TextKey<TRow>, header: string): AppColumn<TRow> {
  return {
    accessorKey: key,
    header,
    meta: { valueType: 'text' },
    cell: ({ row }) => <TextCell value={row.original[key] as string | number | null} />
  }
}

/** A date-time column in tabular figures, such as 创建时间. */
export function dateTimeColumn<TRow extends RowData>(key: TextKey<TRow>, header: string): AppColumn<TRow> {
  return {
    accessorKey: key,
    header,
    meta: { valueType: 'dateTime' },
    cell: ({ row }) => <TextCell value={row.original[key] as string | null} className="tabular-nums" />
  }
}

/** The backend's 启用 / 禁用 status column (1 = 启用, 2 = 禁用), headed 「状态」. */
export function statusColumn<TRow extends RowData>(key: TextKey<TRow>): AppColumn<TRow> {
  return {
    accessorKey: key,
    header: '状态',
    meta: { valueType: 'status' },
    cell: ({ row }) => <StatusCell status={row.original[key] as number | null} />
  }
}

/** The 「操作」 column; `render` returns the screen's `RowActionsMenu`. */
export function optionColumn<TRow extends RowData>(render: (row: TRow) => ReactNode): AppColumn<TRow> {
  return {
    id: 'actions',
    header: '操作',
    enableHiding: false,
    meta: { valueType: 'option' },
    cell: ({ row }) => render(row.original)
  }
}
