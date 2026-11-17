import { type ColumnDef } from '@tanstack/react-table'
import { RotateCcw, Square } from 'lucide-react'

import { RowActionsMenu } from '@/components/row-actions-menu'
import { dateTimeColumn, textColumn } from '@/components/table/columns'
import { DropdownMenuGroup, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import type { JobLogResp } from '@/lib/api/job-log'
import type { DataTableFeatures } from '@/lib/data-table-features'

import { JobExecuteStatusBadge, OperationReasonCell } from './job-log-display'

/** The row actions the table raises. */
export type JobLogAction = 'stop' | 'retry'

interface JobLogColumnOptions {
  /** The index of the first row on the current page, so 序号 stays continuous. */
  readonly rowOffset: number
  readonly canStop: boolean
  readonly canRetry: boolean
  readonly onAction: (action: JobLogAction, log: JobLogResp) => void
}

function RowActions({
  log,
  canStop,
  canRetry,
  onAction
}: {
  log: JobLogResp
  canStop: boolean
  canRetry: boolean
  onAction: (action: JobLogAction, log: JobLogResp) => void
}) {
  const canStopNow = log.taskBatchStatus === 2
  const canRetryNow = log.taskBatchStatus === 4 || log.taskBatchStatus === 5 || log.taskBatchStatus === 6

  return (
    <div className="flex items-center justify-center">
      <RowActionsMenu>
        <DropdownMenuGroup>
          {canStop ? (
            <DropdownMenuItem disabled={!canStopNow} onClick={() => onAction('stop', log)}>
              <Square />
              停止
            </DropdownMenuItem>
          ) : null}
          {canRetry ? (
            <DropdownMenuItem disabled={!canRetryNow} onClick={() => onAction('retry', log)}>
              <RotateCcw />
              重试
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </RowActionsMenu>
    </div>
  )
}

/** Builds the column set of the job log table, in the order of the Vue client's page. */
export function createJobLogColumns({ rowOffset, canStop, canRetry, onAction }: JobLogColumnOptions) {
  const columns: ColumnDef<DataTableFeatures, JobLogResp>[] = [
    {
      id: 'index',
      header: '序号',
      enableHiding: false,
      meta: { valueType: 'index' },
      cell: ({ row }) => (
        <div className="text-center text-sm text-muted-foreground tabular-nums">{rowOffset + row.index + 1}</div>
      )
    },
    textColumn('groupName', '任务组'),
    textColumn('jobName', '任务名称'),
    dateTimeColumn('createDt', '调度时间'),
    {
      accessorKey: 'taskBatchStatus',
      header: () => <div className="text-center">执行状态</div>,
      meta: { valueType: 'status' },
      cell: ({ row }) => (
        <div className="flex justify-center">
          <JobExecuteStatusBadge status={row.original.taskBatchStatus} />
        </div>
      )
    },
    {
      accessorKey: 'operationReason',
      header: '执行备注',
      meta: { valueType: 'text' },
      cell: ({ row }) => <OperationReasonCell reason={row.original.operationReason} />
    },
    dateTimeColumn('executionAt', '执行时间')
  ]

  if (canStop || canRetry) {
    columns.push({
      id: 'actions',
      header: () => <div className="text-center">操作</div>,
      enableHiding: false,
      meta: { valueType: 'option' },
      cell: ({ row }) => <RowActions log={row.original} canStop={canStop} canRetry={canRetry} onAction={onAction} />
    })
  }

  return columns
}
