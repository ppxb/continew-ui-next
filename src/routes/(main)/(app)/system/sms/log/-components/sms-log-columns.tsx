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

type SmsLogColumn = ColumnDef<DataTableFeatures, SmsLogResp>
type TextColumnKey = 'phone' | 'createUserString' | 'createTime'

/** Labels for the columns whose header is a node, which the hide-columns menu cannot read. */
export const SMS_LOG_COLUMN_LABELS: Record<string, string> = {
  status: '发送状态'
}

interface SmsLogColumnOptions {
  /** The index of the first row on the current page, so 序号 stays continuous. */
  readonly rowOffset: number
  /** The delete action needs `system:smsLog:delete`; the column is dropped without it. */
  readonly canDelete: boolean
  readonly onDelete: (log: SmsLogResp) => void
}

function TextCell({ value }: { value: string | null }) {
  return <span>{value || EMPTY_PLACEHOLDER}</span>
}

/** The template parameters and the provider response can both be long JSON strings. */
function LongTextCell({ value }: { value: string | null }) {
  return <span className="block max-w-72">{value || EMPTY_PLACEHOLDER}</span>
}

function textColumn(key: TextColumnKey, header: string): SmsLogColumn {
  return {
    accessorKey: key,
    header,
    cell: ({ row }) => <TextCell value={row.original[key]} />
  }
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

export function createSmsLogColumns({ rowOffset, canDelete, onDelete }: SmsLogColumnOptions): SmsLogColumn[] {
  const columns: SmsLogColumn[] = [
    {
      id: 'index',
      header: '序号',
      enableHiding: false,
      cell: ({ row }) => <div>{rowOffset + row.index + 1}</div>
    },
    textColumn('phone', '手机号'),
    {
      accessorKey: 'params',
      header: '参数配置',
      cell: ({ row }) => <LongTextCell value={row.original.params} />
    },
    {
      accessorKey: 'status',
      header: () => <div>发送状态</div>,
      cell: ({ row }) => <SuccessFailureCell status={row.original.status} />
    },
    {
      accessorKey: 'resMsg',
      header: '返回数据',
      cell: ({ row }) => <LongTextCell value={row.original.resMsg} />
    },
    textColumn('createUserString', '操作人'),
    textColumn('createTime', '操作时间')
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
