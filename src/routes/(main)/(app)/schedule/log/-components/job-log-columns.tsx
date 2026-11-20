import type { DateRange } from 'react-day-picker'
import { RotateCcw, Square } from 'lucide-react'

import { DateRangeFilter } from '@/components/date-range-filter'
import { FilterSelect } from '@/components/filter-select'
import type { ProColumns, ProSchemaValueEnumType } from '@/components/pro'
import { RowActionsMenu } from '@/components/row-actions-menu'
import { TextCell } from '@/components/text-cell'
import { DropdownMenuGroup, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { JOB_EXECUTE_STATUS_OPTIONS, type JobExecuteStatus, type JobLogQuery, type JobLogResp } from '@/lib/api/job-log'
import { toDateTimeRangeQuery } from '@/lib/date-range'

import { JobExecuteStatusBadge, OperationReasonCell } from './job-log-display'

/** The row actions the table raises. */
export type JobLogAction = 'stop' | 'retry'
export type JobLogRecord = JobLogResp & { dateRange?: DateRange }
export type JobLogSearchValues = Omit<JobLogQuery, 'page' | 'size'> & { dateRange?: DateRange }

const STATUS_ENUM = new Map<JobExecuteStatus, ProSchemaValueEnumType>([
  [1, { text: '待处理', status: 'Processing' }],
  [2, { text: '运行中', status: 'Warning' }],
  [3, { text: '成功', status: 'Success' }],
  [4, { text: '已失败', status: 'Error' }],
  [5, { text: '已停止', status: 'Error' }],
  [6, { text: '已取消', status: 'Default' }]
])

interface JobLogColumnOptions {
  readonly canStop: boolean
  readonly canRetry: boolean
  readonly onAction: (action: JobLogAction, log: JobLogResp) => void
  readonly groupOptions: readonly string[]
  readonly onGroupChange: (value: string | undefined) => void
  readonly onFilterChange: () => void
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

export const jobLogColumns: readonly ProColumns<JobLogRecord>[] = [
  { title: '序号', valueType: 'index' },
  {
    title: '任务组',
    dataIndex: 'groupName',
    valueType: 'select',
    search: true,
    hideInForm: true,
    render: (_, log) => <TextCell value={log.groupName} />
  },
  { title: '任务名称', dataIndex: 'jobName', hideInForm: true },
  { title: '调度时间', dataIndex: 'createDt', valueType: 'dateTime', hideInForm: true },
  {
    title: '执行状态',
    dataIndex: 'taskBatchStatus',
    valueType: 'select',
    valueEnum: STATUS_ENUM,
    search: true,
    hideInForm: true,
    align: 'center',
    render: (_, log) => (
      <div className="flex justify-center">
        <JobExecuteStatusBadge status={log.taskBatchStatus} />
      </div>
    )
  },
  {
    title: '执行备注',
    dataIndex: 'operationReason',
    hideInForm: true,
    render: (_, log) => <OperationReasonCell reason={log.operationReason} />
  },
  { title: '执行时间', dataIndex: 'executionAt', valueType: 'dateTime', hideInForm: true },
  {
    title: '调度时间',
    dataIndex: 'dateRange',
    valueType: 'dateRange',
    hideInTable: true,
    hideInForm: true,
    hideInDescriptions: true,
    search: { transform: value => ({ datetimeRange: toDateTimeRangeQuery(value as DateRange | undefined) }) }
  }
]

export function createJobLogColumns({
  canStop,
  canRetry,
  onAction,
  groupOptions,
  onGroupChange,
  onFilterChange
}: JobLogColumnOptions): readonly ProColumns<JobLogRecord>[] {
  const columns = jobLogColumns.map<ProColumns<JobLogRecord>>(column => {
    if (column.valueType === 'dependency') return column
    if (column.dataIndex === 'groupName')
      return {
        ...column,
        formItemRender: (_, control) => (
          <FilterSelect
            label="任务组"
            className="w-full sm:w-40"
            options={[{ value: 'all', label: '全部' }, ...groupOptions.map(group => ({ value: group, label: group }))]}
            value={typeof control.value === 'string' ? control.value : 'all'}
            onValueChange={value => {
              const group = !value || value === 'all' ? undefined : value
              control.onChange(group)
              onGroupChange(group)
              onFilterChange()
            }}
          />
        )
      }
    if (column.dataIndex === 'taskBatchStatus')
      return {
        ...column,
        formItemRender: (_, control) => (
          <FilterSelect
            label="状态"
            options={JOB_EXECUTE_STATUS_OPTIONS}
            className="w-full sm:w-32"
            value={control.value === undefined ? 'all' : String(control.value)}
            onValueChange={value => {
              control.onChange(!value || value === 'all' ? undefined : (Number(value) as JobExecuteStatus))
              onFilterChange()
            }}
          />
        )
      }
    if (column.dataIndex === 'dateRange')
      return {
        ...column,
        formItemRender: (_, control) => (
          <DateRangeFilter
            id={control.id}
            invalid={control.invalid}
            onBlur={control.onBlur}
            value={control.value as DateRange | undefined}
            onChange={value => {
              control.onChange(value)
              onFilterChange()
            }}
          />
        )
      }
    return column
  })
  if (canStop || canRetry)
    columns.push({
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      align: 'center',
      render: (_, log) => <RowActions log={log} canStop={canStop} canRetry={canRetry} onAction={onAction} />
    })
  return columns
}
