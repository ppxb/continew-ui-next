import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2 } from 'lucide-react'

import { RowActionsMenu } from '@/components/row-actions-menu'
import { dateTimeColumn, indexColumn, statusColumn, textColumn } from '@/components/table/columns'
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import type { DictItemResp } from '@/lib/api/dict'
import type { DataTableFeatures } from '@/lib/data-table-features'

import { DictLabelBadge } from './dict-display'

export type DictItemAction = 'update' | 'delete'

interface DictItemColumnOptions {
  readonly canUpdate: boolean
  readonly canDelete: boolean
  readonly onAction: (action: DictItemAction, item: DictItemResp) => void
}

function RowActions({ item, options }: { item: DictItemResp; options: DictItemColumnOptions }) {
  const { canUpdate, canDelete, onAction } = options

  return (
    <div className="flex items-center justify-center">
      <RowActionsMenu>
        {canUpdate && (
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => onAction('update', item)}>
              <Pencil />
              修改
            </DropdownMenuItem>
          </DropdownMenuGroup>
        )}
        {canDelete && (
          <>
            {canUpdate && <DropdownMenuSeparator />}
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" onClick={() => onAction('delete', item)}>
                <Trash2 />
                删除
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
      </RowActionsMenu>
    </div>
  )
}

/** Builds the dictionary item table columns; `rowOffset` keeps the serial number continuous across pages. */
export function createDictItemColumns(
  options: DictItemColumnOptions,
  rowOffset: number
): ColumnDef<DataTableFeatures, DictItemResp>[] {
  const columns: ColumnDef<DataTableFeatures, DictItemResp>[] = [
    indexColumn(rowOffset),
    {
      accessorKey: 'label',
      header: '标签',
      meta: { valueType: 'status' },
      cell: ({ row }) => <DictLabelBadge label={row.original.label} color={row.original.color} />
    },
    textColumn('value', '值'),
    statusColumn('status'),
    textColumn('sort', '排序'),
    textColumn('description', '描述'),
    dateTimeColumn('createTime', '创建时间')
  ]

  if (options.canUpdate || options.canDelete) {
    columns.push({
      id: 'actions',
      header: () => <div className="text-center">操作</div>,
      enableHiding: false,
      meta: { valueType: 'option' },
      cell: ({ row }) => <RowActions item={row.original} options={options} />
    })
  }

  return columns
}
