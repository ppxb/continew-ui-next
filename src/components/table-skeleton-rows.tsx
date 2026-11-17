import type { ReactTable, RowData } from '@tanstack/react-table'

import { cn } from 'cn'

import { VALUE_TYPE_SKELETON } from '@/components/table/columns'
import { Skeleton } from '@/components/ui/skeleton'
import { TableCell, TableRow } from '@/components/ui/table'
import type { DataTableFeatures } from '@/lib/data-table-features'

const DEFAULT_ROW_COUNT = 5
const DEFAULT_WIDTH = 'w-24'

interface TableSkeletonRowsProps<TRow extends RowData> {
  readonly table: ReactTable<DataTableFeatures, TRow>
  /**
   * One width class per column, in order, so a screen can imitate its own cell shapes: a narrow
   * centered serial number, a wide name, a status pill, a small centered action. Columns past the
   * end of the list reuse the last entry, which stands in for the rest of the row.
   *
   * Without it, each column's width comes from the `valueType` it was built with, so hiding a column
   * cannot shift the placeholders onto the wrong cells.
   */
  readonly widths?: readonly string[]
  readonly rowCount?: number
}

/** The placeholder rows a table shows while its first page is loading. */
export function TableSkeletonRows<TRow extends RowData>({
  table,
  widths,
  rowCount = DEFAULT_ROW_COUNT
}: TableSkeletonRowsProps<TRow>) {
  const columns = table.getVisibleLeafColumns()
  const widthAt = (index: number) => {
    if (widths) {
      return widths[index] ?? widths[widths.length - 1] ?? DEFAULT_WIDTH
    }
    const valueType = columns[index]?.columnDef.meta?.valueType
    return valueType ? VALUE_TYPE_SKELETON[valueType] : DEFAULT_WIDTH
  }

  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <TableRow key={rowIndex} className="hover:bg-transparent">
          {columns.map((column, colIndex) => (
            <TableCell key={column.id} className="py-3.5 align-middle">
              <Skeleton className={cn('h-4', widthAt(colIndex))} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}
