import type { DateRange } from 'react-day-picker'

import { DateRangeFilter } from '@/components/date-range-filter'
import { FilterSelect } from '@/components/filter-select'
import type { ProColumns, ProSchemaValueEnumType } from '@/components/pro'
import { TableSearch } from '@/components/table-search'
import { TextCell } from '@/components/text-cell'
import { Button } from '@/components/ui/button'
import type { LogDetailResp, LogExportQuery, LogResp, LogStatus } from '@/lib/api/log'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'
import { toDateTimeRangeQuery } from '@/lib/date-range'

import { LogStatusCell, TimeTakenCell } from './log-display'

export type LogRecord = LogResp & Partial<Pick<LogDetailResp, 'traceId' | 'requestUrl'>> & { dateRange?: DateRange }
export type LogSearchValues = LogExportQuery & { dateRange?: DateRange }

const STATUS_ENUM = new Map<LogStatus, ProSchemaValueEnumType>([
  [1, { text: '成功', status: 'Success' }],
  [2, { text: '失败', status: 'Error' }]
])
const STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: '1', label: '成功' },
  { value: '2', label: '失败' }
]

function statusColumn(): ProColumns<LogRecord> {
  return {
    title: '状态',
    dataIndex: 'status',
    valueType: 'select',
    valueEnum: STATUS_ENUM,
    search: true,
    hideInForm: true,
    formItemRender: (_, control) => (
      <FilterSelect
        label="状态"
        options={STATUS_OPTIONS}
        value={control.value === undefined ? 'all' : String(control.value)}
        className="w-full sm:w-32"
        onValueChange={value => control.onChange(value === '1' ? 1 : value === '2' ? 2 : undefined)}
      />
    ),
    render: (_, log) => <LogStatusCell status={log.status} errorMsg={log.errorMsg} />
  }
}

function dateRangeColumn(title: string): ProColumns<LogRecord> {
  return {
    title,
    dataIndex: 'dateRange',
    valueType: 'dateRange',
    hideInTable: true,
    hideInForm: true,
    hideInDescriptions: true,
    search: { transform: value => ({ createTime: toDateTimeRangeQuery(value as DateRange | undefined) }) },
    formItemRender: (_, control) => (
      <DateRangeFilter
        id={control.id}
        invalid={control.invalid}
        onBlur={control.onBlur}
        value={control.value as DateRange | undefined}
        onChange={control.onChange}
        placeholder={title}
      />
    )
  }
}

function ipColumn(title: string, placeholder: string): ProColumns<LogRecord> {
  return {
    title,
    dataIndex: 'ip',
    search: true,
    hideInForm: true,
    formItemRender: (_, control) => (
      <TableSearch clearable placeholder={placeholder} onSearch={control.onChange} className="w-full md:w-56" />
    )
  }
}

export const loginLogColumns: readonly ProColumns<LogRecord>[] = [
  { title: '序号', valueType: 'index' },
  { title: '登录时间', dataIndex: 'createTime', valueType: 'dateTime', hideInForm: true },
  { title: '用户昵称', dataIndex: 'createUserString', hideInForm: true },
  { title: '登录行为', dataIndex: 'description', hideInForm: true },
  statusColumn(),
  ipColumn('登录 IP', '搜索登录 IP 或地点'),
  { title: '登录地点', dataIndex: 'address', hideInForm: true },
  { title: '浏览器', dataIndex: 'browser', hideInForm: true },
  { title: '终端系统', dataIndex: 'os', hideInForm: true },
  dateRangeColumn('登录时间')
]

export const operationLogColumns: readonly ProColumns<LogRecord>[] = [
  { title: '序号', valueType: 'index' },
  {
    title: '日志 ID',
    dataIndex: 'id',
    hideInTable: true,
    hideInForm: true,
    render: (_, log) => <span className="break-all">{log.id}</span>
  },
  {
    title: 'Trace ID',
    dataIndex: 'traceId',
    hideInTable: true,
    hideInForm: true,
    render: (_, log) => <span className="break-all">{log.traceId || EMPTY_PLACEHOLDER}</span>
  },
  { title: '操作时间', dataIndex: 'createTime', valueType: 'dateTime', hideInForm: true },
  { title: '操作人', dataIndex: 'createUserString', hideInForm: true },
  { title: '操作内容', dataIndex: 'description', hideInForm: true },
  { title: '所属模块', dataIndex: 'module', hideInForm: true },
  statusColumn(),
  ipColumn('操作 IP', '搜索操作 IP 或地点'),
  { title: '操作地点', dataIndex: 'address', hideInForm: true },
  {
    title: '耗时',
    dataIndex: 'timeTaken',
    hideInForm: true,
    render: (_, log) => <TimeTakenCell timeTaken={log.timeTaken} />
  },
  { title: '浏览器', dataIndex: 'browser', hideInForm: true },
  { title: '终端系统', dataIndex: 'os', hideInForm: true },
  {
    title: '请求 URI',
    dataIndex: 'requestUrl',
    hideInTable: true,
    hideInForm: true,
    span: 2,
    render: (_, log) => <span className="break-all">{log.requestUrl || EMPTY_PLACEHOLDER}</span>
  },
  dateRangeColumn('操作时间')
]

export function createOperationLogColumns({
  canViewDetail,
  onDetail
}: {
  readonly canViewDetail: boolean
  readonly onDetail: (log: LogResp) => void
}): readonly ProColumns<LogRecord>[] {
  return operationLogColumns.map<ProColumns<LogRecord>>(column =>
    column.valueType !== 'dependency' && column.dataIndex === 'createTime'
      ? {
          ...column,
          render: (_, log, _index, _action, { type }) =>
            type === 'table' && canViewDetail ? (
              <Button variant="link" className="h-auto border-0 p-0 text-sm font-normal" onClick={() => onDetail(log)}>
                {log.createTime}
              </Button>
            ) : (
              <TextCell value={log.createTime} />
            )
        }
      : column
  )
}
