import { type ColumnDef } from '@tanstack/react-table'
import { Eye, MoreHorizontal, Pen, Play, ScrollText, Trash2 } from 'lucide-react'

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
import type { JobResp, JobStatus } from '@/lib/api/job'
import type { DataTableFeatures } from '@/lib/data-table-features'

import { JobStatusSwitch, TaskTypeCell, TextCell, TriggerTypeCell } from './job-display'

/** The row actions the table raises. */
export type JobAction = 'detail' | 'trigger' | 'edit' | 'logs' | 'delete'

interface JobColumnOptions {
  /** The index of the first row on the current page, so 序号 stays continuous. */
  readonly rowOffset: number
  readonly canGet: boolean
  readonly canTrigger: boolean
  readonly canUpdate: boolean
  readonly canViewLogs: boolean
  readonly canDelete: boolean
  readonly onAction: (action: JobAction, job: JobResp) => void
  readonly onToggleStatus: (job: JobResp, next: JobStatus) => Promise<void>
}

function RowActions({
  job,
  canGet,
  canTrigger,
  canUpdate,
  canViewLogs,
  canDelete,
  onAction
}: {
  job: JobResp
  canGet: boolean
  canTrigger: boolean
  canUpdate: boolean
  canViewLogs: boolean
  canDelete: boolean
  onAction: (action: JobAction, job: JobResp) => void
}) {
  const hasPrimary = canGet || canTrigger || canUpdate || canViewLogs

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
          {hasPrimary ? (
            <DropdownMenuGroup>
              {canGet ? (
                <DropdownMenuItem onClick={() => onAction('detail', job)}>
                  <Eye />
                  详情
                </DropdownMenuItem>
              ) : null}
              {canTrigger ? (
                <DropdownMenuItem onClick={() => onAction('trigger', job)}>
                  <Play />
                  执行
                </DropdownMenuItem>
              ) : null}
              {canUpdate ? (
                <DropdownMenuItem onClick={() => onAction('edit', job)}>
                  <Pen />
                  修改
                </DropdownMenuItem>
              ) : null}
              {canViewLogs ? (
                <DropdownMenuItem onClick={() => onAction('logs', job)}>
                  <ScrollText />
                  查看日志
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>
          ) : null}
          {hasPrimary && canDelete ? <DropdownMenuSeparator /> : null}
          {canDelete ? (
            <DropdownMenuItem variant="destructive" onClick={() => onAction('delete', job)}>
              <Trash2 />
              删除
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/** Builds the column set of the job table, in the order of the Vue client's page. */
export function createJobColumns({
  rowOffset,
  canGet,
  canTrigger,
  canUpdate,
  canViewLogs,
  canDelete,
  onAction,
  onToggleStatus
}: JobColumnOptions) {
  const columns: ColumnDef<DataTableFeatures, JobResp>[] = [
    {
      id: 'index',
      header: '序号',
      enableHiding: false,
      cell: ({ row }) => (
        <div className="text-center text-sm text-muted-foreground tabular-nums">{rowOffset + row.index + 1}</div>
      )
    },
    {
      accessorKey: 'jobName',
      header: '任务名称',
      cell: ({ row }) => <TextCell value={row.original.jobName} />
    },
    {
      accessorKey: 'triggerType',
      header: '调度类型',
      cell: ({ row }) => <TriggerTypeCell job={row.original} />
    },
    {
      accessorKey: 'taskType',
      header: '任务类型',
      cell: ({ row }) => <TaskTypeCell job={row.original} />
    },
    {
      accessorKey: 'jobStatus',
      header: () => <div className="text-center">状态</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <JobStatusSwitch job={row.original} canUpdate={canUpdate} onToggle={onToggleStatus} />
        </div>
      )
    },
    {
      accessorKey: 'description',
      header: '描述',
      cell: ({ row }) => <TextCell value={row.original.description} />
    },
    {
      accessorKey: 'createDt',
      header: '创建时间',
      cell: ({ row }) => <TextCell value={row.original.createDt} />
    },
    {
      accessorKey: 'updateDt',
      header: '修改时间',
      cell: ({ row }) => <TextCell value={row.original.updateDt} />
    }
  ]

  if (canGet || canTrigger || canUpdate || canViewLogs || canDelete) {
    columns.push({
      id: 'actions',
      header: () => <div className="text-center">操作</div>,
      enableHiding: false,
      cell: ({ row }) => (
        <RowActions
          job={row.original}
          canGet={canGet}
          canTrigger={canTrigger}
          canUpdate={canUpdate}
          canViewLogs={canViewLogs}
          canDelete={canDelete}
          onAction={onAction}
        />
      )
    })
  }

  return columns
}
