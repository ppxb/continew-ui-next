import type { ColumnDef, ColumnVisibilityState } from '@tanstack/react-table'

import { Eye, FileText, MoreHorizontal, Pen, Trash2 } from 'lucide-react'

import { FlagBadge } from '@/components/data-badge'
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
import { usePermission } from '@/hooks/use-permission'
import type { NoticeResp } from '@/lib/api/notice'
import type { DataTableFeatures } from '@/lib/data-table-features'

import { NoticeMethodTags, NoticeStatusBadge, NoticeTypeBadge, noticeOptionLabel, TextCell } from './notice-display'
import type { NoticeDicts } from './use-notice-dicts'

export type NoticeAction = 'detail' | 'view' | 'edit' | 'delete'

/** 置顶 is hidden by default, as it is in the Vue table. */
export const HIDDEN_BY_DEFAULT: ColumnVisibilityState = {
  isTop: false
}

/** Every code the row menu can show; the menu is dropped when the user has none of them. */
const ROW_ACTION_PERMISSIONS = [
  'system:notice:get',
  'system:notice:view',
  'system:notice:update',
  'system:notice:delete'
]

function yesNoColumn(key: 'isTiming' | 'isTop', header: string): ColumnDef<DataTableFeatures, NoticeResp> {
  return {
    accessorKey: key,
    header,
    cell: ({ row }) => (
      <div className="flex justify-center">
        <FlagBadge active={row.original[key]} activeLabel="是" inactiveLabel="否" />
      </div>
    )
  }
}

function RowActions({
  notice,
  onAction
}: {
  notice: NoticeResp
  onAction: (action: NoticeAction, notice: NoticeResp) => void
}) {
  const { hasPermission, hasAnyPermission } = usePermission()

  if (!hasAnyPermission(ROW_ACTION_PERMISSIONS)) {
    return null
  }

  return (
    <div className="flex items-center justify-center">
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger render={<DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />} />}>
            <MoreHorizontal />
          </TooltipTrigger>
          <TooltipContent side="top">更多操作</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            {hasPermission('system:notice:get') && (
              <DropdownMenuItem onClick={() => onAction('detail', notice)}>
                <FileText />
                详情
              </DropdownMenuItem>
            )}
            {hasPermission('system:notice:view') && (
              <DropdownMenuItem onClick={() => onAction('view', notice)}>
                <Eye />
                查看
              </DropdownMenuItem>
            )}
            {hasPermission('system:notice:update') && (
              <DropdownMenuItem onClick={() => onAction('edit', notice)}>
                <Pen />
                修改
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          {hasPermission('system:notice:delete') && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive" onClick={() => onAction('delete', notice)}>
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

/** Builds the notice table columns, matching the Vue order and the user table conventions. */
export function createNoticeColumns(
  dicts: NoticeDicts,
  onAction: (action: NoticeAction, notice: NoticeResp) => void,
  rowOffset: number
): ColumnDef<DataTableFeatures, NoticeResp>[] {
  return [
    {
      id: 'index',
      header: '序号',
      enableHiding: false,
      cell: ({ row }) => <div>{rowOffset + row.index + 1}</div>
    },
    {
      accessorKey: 'title',
      header: '公告标题',
      cell: ({ row }) => <TextCell value={row.original.title} className="max-w-72 font-medium" />
    },
    {
      accessorKey: 'createUserString',
      header: '发布人',
      cell: ({ row }) => <TextCell value={row.original.createUserString} />
    },
    {
      accessorKey: 'noticeScope',
      header: '通知范围',
      cell: ({ row }) => <div>{noticeOptionLabel(dicts.scopeOptions, row.original.noticeScope)}</div>
    },
    {
      accessorKey: 'noticeMethods',
      header: '通知方式',
      cell: ({ row }) => <NoticeMethodTags methods={row.original.noticeMethods} options={dicts.methodOptions} />
    },
    {
      accessorKey: 'type',
      header: '分类',
      cell: ({ row }) => (
        <div className="flex justify-center">
          <NoticeTypeBadge type={row.original.type} options={dicts.typeOptions} />
        </div>
      )
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => (
        <div className="flex justify-center">
          <NoticeStatusBadge status={row.original.status} options={dicts.statusOptions} />
        </div>
      )
    },
    yesNoColumn('isTiming', '是否定时'),
    {
      accessorKey: 'publishTime',
      header: '发布时间',
      cell: ({ row }) => <TextCell value={row.original.publishTime} />
    },
    yesNoColumn('isTop', '是否置顶'),
    {
      id: 'actions',
      header: () => <div className="text-center">操作</div>,
      enableHiding: false,
      cell: ({ row }) => <RowActions notice={row.original} onAction={onAction} />
    }
  ]
}
