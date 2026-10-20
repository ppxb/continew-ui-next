import type { ColumnDef, ColumnVisibilityState } from '@tanstack/react-table'

import { Eye, FileText, MoreHorizontal, Pen, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
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
import type { NoticeResp } from '@/lib/api/notice'
import type { DataTableFeatures } from '@/lib/data-table-features'

import { NoticeMethodTags, NoticeStatusBadge, NoticeTypeBadge, TextCell, noticeOptionLabel } from './notice-display'
import type { NoticeDictOption } from './use-notice-dicts'

export type NoticeAction = 'detail' | 'view' | 'edit' | 'delete'

/** 置顶 is hidden by default, as it is in the Vue table. */
export const HIDDEN_BY_DEFAULT: ColumnVisibilityState = {
  isTop: false
}

interface NoticeColumnOptions {
  readonly typeOptions: NoticeDictOption[]
  readonly scopeOptions: NoticeDictOption[]
  readonly methodOptions: NoticeDictOption[]
  readonly statusOptions: NoticeDictOption[]
  readonly canDetail: boolean
  readonly canView: boolean
  readonly canUpdate: boolean
  readonly canDelete: boolean
  readonly onAction: (action: NoticeAction, notice: NoticeResp) => void
}

function RowActions({ notice, options }: { notice: NoticeResp; options: NoticeColumnOptions }) {
  const { canDetail, canView, canUpdate, canDelete, onAction } = options
  const hasAny = canDetail || canView || canUpdate || canDelete

  if (!hasAny) {
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
          {canDetail || canView || canUpdate ? (
            <DropdownMenuGroup>
              {canDetail ? (
                <DropdownMenuItem onClick={() => onAction('detail', notice)}>
                  <FileText />
                  详情
                </DropdownMenuItem>
              ) : null}
              {canView ? (
                <DropdownMenuItem onClick={() => onAction('view', notice)}>
                  <Eye />
                  查看
                </DropdownMenuItem>
              ) : null}
              {canUpdate ? (
                <DropdownMenuItem onClick={() => onAction('edit', notice)}>
                  <Pen />
                  修改
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>
          ) : null}
          {canDelete ? (
            <>
              {canDetail || canView || canUpdate ? <DropdownMenuSeparator /> : null}
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive" onClick={() => onAction('delete', notice)}>
                  <Trash2 />
                  删除
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/** Builds the notice table columns, matching the Vue order and the user table conventions. */
export function createNoticeColumns(options: NoticeColumnOptions, rowOffset: number) {
  const columns: ColumnDef<DataTableFeatures, NoticeResp>[] = [
    {
      id: 'index',
      header: '序号',
      enableHiding: false,
      cell: ({ row }) => (
        <div className="text-center text-sm text-muted-foreground tabular-nums">{rowOffset + row.index + 1}</div>
      )
    },
    {
      accessorKey: 'title',
      header: '公告标题',
      cell: ({ row }) => (
        <span className="block max-w-72 truncate text-sm font-medium" title={row.original.title}>
          {row.original.title}
        </span>
      )
    },
    {
      accessorKey: 'createUserString',
      header: '发布人',
      cell: ({ row }) => <TextCell value={row.original.createUserString} />
    },
    {
      accessorKey: 'noticeScope',
      header: '通知范围',
      cell: ({ row }) => (
        <div className="text-center text-sm">{noticeOptionLabel(options.scopeOptions, row.original.noticeScope)}</div>
      )
    },
    {
      accessorKey: 'noticeMethods',
      header: '通知方式',
      cell: ({ row }) => <NoticeMethodTags methods={row.original.noticeMethods} options={options.methodOptions} />
    },
    {
      accessorKey: 'type',
      header: '分类',
      cell: ({ row }) => (
        <div className="flex justify-center">
          <NoticeTypeBadge type={row.original.type} options={options.typeOptions} />
        </div>
      )
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => (
        <div className="flex justify-center">
          <NoticeStatusBadge status={row.original.status} options={options.statusOptions} />
        </div>
      )
    },
    {
      accessorKey: 'isTiming',
      header: '是否定时',
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Badge variant={row.original.isTiming ? 'secondary' : 'outline'} className="font-normal">
            {row.original.isTiming ? '是' : '否'}
          </Badge>
        </div>
      )
    },
    {
      accessorKey: 'publishTime',
      header: '发布时间',
      cell: ({ row }) => <TextCell value={row.original.publishTime} />
    },
    {
      accessorKey: 'isTop',
      header: '是否置顶',
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Badge variant={row.original.isTop ? 'secondary' : 'outline'} className="font-normal">
            {row.original.isTop ? '是' : '否'}
          </Badge>
        </div>
      )
    },
    {
      id: 'actions',
      header: () => <div className="text-center">操作</div>,
      enableHiding: false,
      cell: ({ row }) => <RowActions notice={row.original} options={options} />
    }
  ]

  return columns
}
