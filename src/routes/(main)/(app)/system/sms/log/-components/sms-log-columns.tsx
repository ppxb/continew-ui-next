import { Trash2 } from 'lucide-react'

import { FilterSelect } from '@/components/filter-select'
import type { ProColumns, ProSchemaValueEnumType } from '@/components/pro'
import { RowActionsMenu } from '@/components/row-actions-menu'
import { SuccessFailureCell } from '@/components/status-cell'
import { TextCell } from '@/components/text-cell'
import { DropdownMenuGroup, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import type { SmsLogResp, SmsLogStatus } from '@/lib/api/sms-log'

const STATUS_ENUM = new Map<SmsLogStatus, ProSchemaValueEnumType>([
  [1, { text: '成功', status: 'Success' }],
  [2, { text: '失败', status: 'Error' }]
])
const STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: '1', label: '成功' },
  { value: '2', label: '失败' }
]

interface SmsLogColumnOptions {
  /** The delete action needs `system:smsLog:delete`; the column is dropped without it. */
  readonly canDelete: boolean
  readonly onDelete: (log: SmsLogResp) => void
}

function RowActions({ log, onDelete }: { log: SmsLogResp; onDelete: (log: SmsLogResp) => void }) {
  return (
    <div className="flex items-center justify-center">
      <RowActionsMenu>
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" disabled={Boolean(log.disabled)} onClick={() => onDelete(log)}>
            <Trash2 />
            删除
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </RowActionsMenu>
    </div>
  )
}

export const smsLogColumns: readonly ProColumns<SmsLogResp>[] = [
  { title: '序号', valueType: 'index' },
  {
    title: '配置 ID',
    dataIndex: 'configId',
    hideInTable: true,
    hideInForm: true,
    hideInDescriptions: true,
    search: {
      transform: value => ({ configId: typeof value === 'string' && /^\d+$/.test(value) ? value : undefined })
    },
    fieldProps: { placeholder: '配置 ID' }
  },
  {
    title: '手机号',
    dataIndex: 'phone',
    search: true,
    hideInForm: true,
    fieldProps: { placeholder: '手机号' }
  },
  {
    title: '参数配置',
    dataIndex: 'params',
    hideInForm: true,
    render: (_, log) => <TextCell value={log.params} maxWidth="max-w-72" truncate={false} />
  },
  {
    title: '发送状态',
    dataIndex: 'status',
    valueType: 'select',
    valueEnum: STATUS_ENUM,
    search: { inline: true },
    hideInForm: true,
    formItemRender: (_, control) => (
      <FilterSelect
        label="状态"
        options={STATUS_OPTIONS}
        className="w-full sm:w-32"
        value={control.value === undefined ? 'all' : String(control.value)}
        onValueChange={value => control.onChange(value === '1' ? 1 : value === '2' ? 2 : undefined)}
      />
    ),
    render: (_, log) => <SuccessFailureCell status={log.status} />
  },
  {
    title: '返回数据',
    dataIndex: 'resMsg',
    hideInForm: true,
    render: (_, log) => <TextCell value={log.resMsg} maxWidth="max-w-72" truncate={false} />
  },
  { title: '操作人', dataIndex: 'createUserString', hideInForm: true },
  { title: '操作时间', dataIndex: 'createTime', valueType: 'dateTime', hideInForm: true }
]

export function createSmsLogColumns({ canDelete, onDelete }: SmsLogColumnOptions): readonly ProColumns<SmsLogResp>[] {
  return canDelete
    ? [
        ...smsLogColumns,
        {
          title: '操作',
          valueType: 'option',
          align: 'center',
          render: (_, log) => <RowActions log={log} onDelete={onDelete} />
        }
      ]
    : smsLogColumns
}
