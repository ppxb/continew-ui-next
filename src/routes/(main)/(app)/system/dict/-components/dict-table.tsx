import { cn } from 'cn'

import { QueryState } from '@/components/query-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { DictItemResp } from '@/lib/api/dict'

import { type DictItemColumn, DICT_ITEM_TABLE_MIN_WIDTH } from './dict-columns'

/** Keeps the horizontal scrollbar as thin as the storage and infrastructure tables. */
const SCROLL_CONTAINER_CLASS =
  'scrollbar-thin [scrollbar-color:var(--border)_transparent] overflow-x-auto **:data-[slot=table-container]:overflow-visible [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent'

const TABLE_CLASS = "table-fixed **:data-[slot='table-cell']:px-5 **:data-[slot='table-head']:px-5"

interface DictTableProps {
  readonly items: DictItemResp[]
  readonly columns: DictItemColumn[]
  readonly isLoading: boolean
  readonly isError: boolean
  readonly onRetry: () => void
}

/** The plain item table of one dictionary, styled like the storage group tables. */
export function DictTable({ items, columns, isLoading, isError, onRetry }: DictTableProps) {
  if (isError) {
    return (
      <QueryState
        state="error"
        title="字典项加载失败"
        className="min-h-24 rounded-none border-t bg-muted/50 p-4"
        onRetry={onRetry}
      />
    )
  }

  if (isLoading && items.length === 0) {
    return <DictTableSkeleton columns={columns} />
  }

  if (items.length === 0) {
    return <QueryState state="empty" title="暂无字典项" className="min-h-24 rounded-none border-t bg-muted/50 p-4" />
  }

  return (
    <div className={SCROLL_CONTAINER_CLASS}>
      <Table className={cn(TABLE_CLASS, DICT_ITEM_TABLE_MIN_WIDTH)}>
        <TableColGroup columns={columns} />

        <TableHeader className="bg-muted/50 [&_tr]:border-y">
          <TableRow>
            {columns.map(column => (
              <TableHead key={column.id} className={cn('font-medium', column.headerClassName)}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody className="**:data-[slot='table-row']:hover:bg-transparent">
          {items.map((item, index) => (
            <TableRow key={String(item.id)}>
              {columns.map(column => (
                <TableCell key={column.id}>{column.cell(item, index)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function DictTableSkeleton({ columns }: { columns: DictItemColumn[] }) {
  return (
    <div className={SCROLL_CONTAINER_CLASS}>
      <Table className={cn(TABLE_CLASS, DICT_ITEM_TABLE_MIN_WIDTH)}>
        <TableColGroup columns={columns} />

        <TableHeader className="bg-muted/50 [&_tr]:border-y">
          <TableRow>
            {columns.map(column => (
              <TableHead key={column.id} className={cn('font-medium', column.headerClassName)}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody className="**:data-[slot='table-row']:hover:bg-transparent">
          {Array.from({ length: 2 }, (_, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map(column => (
                <TableCell key={column.id}>
                  <Skeleton className={cn('h-4', column.id === 'actions' ? 'ml-auto w-8' : 'w-24')} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function TableColGroup({ columns }: { columns: DictItemColumn[] }) {
  return (
    <colgroup>
      {columns.map(column => (
        <col key={column.id} className={column.width} />
      ))}
    </colgroup>
  )
}
