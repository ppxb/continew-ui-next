import type { ReactTable } from '@tanstack/react-table'

import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { MenuResp } from '@/lib/api/menu'
import type { DataTableFeatures } from '@/lib/data-table-features'
import { cn } from 'cn'

interface MenuTableProps {
  readonly table: ReactTable<DataTableFeatures, MenuResp>
  readonly isLoading: boolean
  readonly total: number
}

function TableSkeletonRows({ columnCount }: { columnCount: number }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, rowIndex) => (
        <TableRow key={rowIndex} className="hover:bg-transparent">
          {Array.from({ length: columnCount }).map((_, colIndex) => (
            <TableCell key={colIndex} className="py-3.5 align-middle">
              <Skeleton
                className={cn(
                  'h-4',
                  colIndex === 0 ? 'w-40' : colIndex === 1 || colIndex === 2 ? 'mx-auto w-12' : 'w-24'
                )}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

export function MenuTable({ table, isLoading, total }: MenuTableProps) {
  const visibleColumns = table.getVisibleLeafColumns()
  const rows = table.getRowModel().rows

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className={cn(
                      'text-xs font-medium',
                      header.id === 'type' ||
                        header.id === 'status' ||
                        header.id === 'sort' ||
                        header.id === 'actions' ||
                        header.id === 'isHidden' ||
                        header.id === 'isExternal' ||
                        header.id === 'isCache'
                        ? 'text-center'
                        : ''
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : typeof header.column.columnDef.header === 'function'
                        ? header.column.columnDef.header(header.getContext())
                        : header.column.columnDef.header}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows columnCount={visibleColumns.length} />
            ) : rows.length > 0 ? (
              rows.map(row => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(
                    'group/row transition-colors hover:bg-muted/40',
                    row.original.type === 1 ? 'bg-muted/15 font-medium' : ''
                  )}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                      className="py-2.5 align-middle text-xs"
                    >
                      {cell.column.columnDef.cell &&
                        (typeof cell.column.columnDef.cell === 'function'
                          ? cell.column.columnDef.cell(cell.getContext())
                          : cell.column.columnDef.cell)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={visibleColumns.length} className="h-40 text-center text-xs text-muted-foreground">
                  未找到匹配的菜单数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <div>
          共 <span className="font-medium text-foreground">{total}</span> 项菜单节点
        </div>
      </div>
    </div>
  )
}
