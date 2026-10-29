import type { ReactNode } from 'react'

import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

import { StatusCell } from '@/components/status-cell'
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

import { DictLabelBadge, TextCell } from './dict-display'

export type DictItemAction = 'update' | 'delete'

export interface DictItemColumn {
  readonly id: string
  readonly header: string
  /** `colgroup` width; the tables use a fixed layout so long text truncates. */
  readonly width: string
  readonly headerClassName?: string
  readonly cell: (item: DictItemResp, index: number) => ReactNode
}

interface DictItemColumnOptions {
  readonly canUpdate: boolean
  readonly canDelete: boolean
  readonly onAction: (action: DictItemAction, item: DictItemResp) => void
}

/** Sum of the item column widths, so the fixed layout keeps them instead of squeezing. */
export const DICT_ITEM_TABLE_MIN_WIDTH = 'min-w-[1040px]'

function RowActions({ item, options }: { item: DictItemResp; options: DictItemColumnOptions }) {
  const { canUpdate, canDelete, onAction } = options

  return (
    <div className="flex items-center justify-end">
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

/** The visible columns of the Vue item table: audit users and update time stay hidden. */
export function createDictItemColumns(options: DictItemColumnOptions): DictItemColumn[] {
  const columns: DictItemColumn[] = [
    {
      id: 'index',
      header: '序号',
      width: 'w-16',
      cell: (_item, index) => <span>{index + 1}</span>
    },
    {
      id: 'label',
      header: '标签',
      width: 'w-32',
      cell: item => <DictLabelBadge label={item.label} color={item.color} />
    },
    {
      id: 'value',
      header: '值',
      width: 'w-40',
      cell: item => <TextCell value={item.value} />
    },
    {
      id: 'status',
      header: '状态',
      width: 'w-24',
      cell: item => <StatusCell status={item.status} />
    },
    {
      id: 'sort',
      header: '排序',
      width: 'w-20',
      cell: item => <div>{item.sort}</div>
    },
    {
      id: 'description',
      header: '描述',
      width: 'w-64',
      cell: item => <TextCell value={item.description} />
    },
    {
      id: 'createTime',
      header: '创建时间',
      width: 'w-44',
      cell: item => <TextCell value={item.createTime} />
    }
  ]

  if (options.canUpdate || options.canDelete) {
    columns.push({
      id: 'actions',
      header: '操作',
      width: 'w-20',
      headerClassName: 'text-right',
      cell: item => <RowActions item={item} options={options} />
    })
  }

  return columns
}
