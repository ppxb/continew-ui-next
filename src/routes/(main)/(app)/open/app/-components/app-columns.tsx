import type { ColumnDef } from '@tanstack/react-table'

import { Eye, KeyRound, MoreHorizontal, PenLine, RotateCcw, Trash2 } from 'lucide-react'

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
import type { AppResp } from '@/lib/api/app'
import type { DataTableFeatures } from '@/lib/data-table-features'

import { AccessKeyCell, EMPTY_PLACEHOLDER, ExpireTimeCell } from './app-display'

/** The row actions the table raises. */
export type AppAction = 'detail' | 'edit' | 'secret' | 'resetSecret' | 'delete'

function TextCell({ value }: { value: string | null }) {
  return <span className="text-sm">{value || EMPTY_PLACEHOLDER}</span>
}

function RowActions({ app, onAction }: { app: AppResp; onAction: (action: AppAction, app: AppResp) => void }) {
  const isLocked = Boolean(app.disabled)

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger render={<DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />} />}>
            <MoreHorizontal className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            更多操作
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => onAction('detail', app)}>
              <Eye />
              应用详情
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isLocked} onClick={() => onAction('edit', app)}>
              <PenLine />
              修改应用
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('secret', app)}>
              <KeyRound />
              查看密钥
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem disabled={isLocked} onClick={() => onAction('resetSecret', app)}>
              <RotateCcw />
              重置密钥
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive" disabled={isLocked} onClick={() => onAction('delete', app)}>
              <Trash2 />
              删除
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/**
 * Builds the column set of the app table without selection column.
 *
 * `rowOffset` is the index of the first row on the current page.
 */
export function createAppColumns(onAction: (action: AppAction, app: AppResp) => void, rowOffset: number) {
  const columns: ColumnDef<DataTableFeatures, AppResp>[] = [
    {
      id: 'index',
      header: '序号',
      enableHiding: false,
      cell: ({ row }) => <div className="text-sm text-muted-foreground tabular-nums">{rowOffset + row.index + 1}</div>
    },
    {
      accessorKey: 'name',
      header: '应用名称',
      cell: ({ row }) => <span className="text-sm font-medium text-foreground">{row.original.name}</span>
    },
    {
      accessorKey: 'accessKey',
      header: 'Access Key',
      cell: ({ row }) => <AccessKeyCell accessKey={row.original.accessKey} />
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => <StatusCell status={row.original.status} />
    },
    {
      accessorKey: 'expireTime',
      header: '失效时间',
      cell: ({ row }) => <ExpireTimeCell expireTime={row.original.expireTime} />
    },
    {
      accessorKey: 'description',
      header: '描述',
      cell: ({ row }) => <TextCell value={row.original.description} />
    },
    {
      accessorKey: 'createUserString',
      header: '创建人',
      cell: ({ row }) => <TextCell value={row.original.createUserString} />
    },
    {
      accessorKey: 'createTime',
      header: '创建时间',
      cell: ({ row }) => <TextCell value={row.original.createTime} />
    },
    {
      accessorKey: 'updateUserString',
      header: '修改人',
      cell: ({ row }) => <TextCell value={row.original.updateUserString} />
    },
    {
      accessorKey: 'updateTime',
      header: '修改时间',
      cell: ({ row }) => <TextCell value={row.original.updateTime} />
    },
    {
      id: 'actions',
      header: '操作',
      enableHiding: false,
      cell: ({ row }) => <RowActions app={row.original} onAction={onAction} />
    }
  ]

  return columns
}
