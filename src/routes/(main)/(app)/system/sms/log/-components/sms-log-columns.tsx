import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Trash2 } from 'lucide-react'

import { SuccessFailureCell } from '@/components/status-cell'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { SmsLogResp } from '@/lib/api/sms-log'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'
import type { DataTableFeatures } from '@/lib/data-table-features'

interface SmsLogColumnOptions {
  /** The index of the first row on the current page, so 序号 stays continuous. */
  readonly rowOffset: number
  /** The delete action needs `system:smsLog:delete`; the column is dropped without it. */
  readonly canDelete: boolean
  readonly onDelete: (log: SmsLogResp) => void
}

function TextCell({ value }: { value: string | null | undefined }) {
  return <span className="text-sm">{value || EMPTY_PLACEHOLDER}</span>
}

/** The request parameters and the provider response can both be long JSON strings. */
function LongTextCell({ value }: { value: string | null }) {
  return <span className="block max-w-72 text-sm wrap-break-word">{value || EMPTY_PLACEHOLDER}</span>
}

function RowActions({ log, onDelete }: { log: SmsLogResp; onDelete: (log: SmsLogResp) => void }) {
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
            <DropdownMenuItem variant="destructive" disabled={Boolean(log.disabled)} onClick={() => onDelete(log)}>
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
 * Builds the column set of the SMS log table.
 *
 * The fields follow the Vue client's `monitor/sms/log` page: the receiver, the template
 * parameters, the send result and the provider's response, then who sent it and when.
 */
export function createSmsLogColumns({ rowOffset, canDelete, onDelete }: SmsLogColumnOptions) {
  const columns: ColumnDef<DataTableFeatures, SmsLogResp>[] = [
    {
      id: 'index',
      header: '序号',
      enableHiding: false,
      cell: ({ row }) => (
        <div className="text-center text-sm text-muted-foreground tabular-nums">{rowOffset + row.index + 1}</div>
      )
    },
    {
      accessorKey: 'phone',
      header: '手机号',
      cell: ({ row }) => <TextCell value={row.original.phone} />
    },
    {
      accessorKey: 'params',
      header: '参数配置',
      cell: ({ row }) => <LongTextCell value={row.original.params} />
    },
    {
      accessorKey: 'status',
      header: () => <div className="text-center">发送状态</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <SuccessFailureCell status={row.original.status} />
        </div>
      )
    },
    {
      accessorKey: 'resMsg',
      header: '返回数据',
      cell: ({ row }) => <LongTextCell value={row.original.resMsg} />
    },
    {
      accessorKey: 'createUserString',
      header: '操作人',
      cell: ({ row }) => <TextCell value={row.original.createUserString} />
    },
    {
      accessorKey: 'createTime',
      header: '操作时间',
      cell: ({ row }) => <TextCell value={row.original.createTime} />
    }
  ]

  if (canDelete) {
    columns.push({
      id: 'actions',
      header: () => <div className="text-center">操作</div>,
      enableHiding: false,
      cell: ({ row }) => <RowActions log={row.original} onDelete={onDelete} />
    })
  }

  return columns
}
