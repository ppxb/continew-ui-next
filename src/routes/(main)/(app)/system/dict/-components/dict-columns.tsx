import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

import { StatusCell } from '@/components/status-cell'
import { TextCell } from '@/components/text-cell'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger render={<DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />} />}>
            <MoreHorizontal />
          </TooltipTrigger>
          <TooltipContent side="top">更多操作</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-36">
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
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/** Builds the dictionary item table columns; `rowOffset` keeps the serial number continuous across pages. */
export function createDictItemColumns(
  options: DictItemColumnOptions,
  rowOffset: number
): ColumnDef<DataTableFeatures, DictItemResp>[] {
  const columns: ColumnDef<DataTableFeatures, DictItemResp>[] = [
    {
      id: 'index',
      header: '序号',
      enableHiding: false,
      cell: ({ row }) => <div className="tabular-nums">{rowOffset + row.index + 1}</div>
    },
    {
      accessorKey: 'label',
      header: '标签',
      cell: ({ row }) => <DictLabelBadge label={row.original.label} color={row.original.color} />
    },
    {
      accessorKey: 'value',
      header: '值',
      cell: ({ row }) => <TextCell value={row.original.value} />
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => <StatusCell status={row.original.status} />
    },
    {
      accessorKey: 'sort',
      header: '排序',
      cell: ({ row }) => <div>{row.original.sort}</div>
    },
    {
      accessorKey: 'description',
      header: '描述',
      cell: ({ row }) => <TextCell value={row.original.description} />
    },
    {
      accessorKey: 'createTime',
      header: '创建时间',
      cell: ({ row }) => <TextCell value={row.original.createTime} />
    }
  ]

  if (options.canUpdate || options.canDelete) {
    columns.push({
      id: 'actions',
      header: () => <div className="text-center">操作</div>,
      enableHiding: false,
      cell: ({ row }) => <RowActions item={row.original} options={options} />
    })
  }

  return columns
}
