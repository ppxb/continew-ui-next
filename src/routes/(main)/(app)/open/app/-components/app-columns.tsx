import { z } from 'zod'

import { Clock, Eye, KeyRound, Pen, RotateCcw, Trash2 } from 'lucide-react'

import { CopyableText } from '@/components/copyable-text'
import { TableDropdown, type ProColumns, type ProSchemaValueEnumType } from '@/components/pro'
import type { AppResp, AppStatus } from '@/lib/api/app'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'

import { AccessKeyCell, ExpireTimeCell } from './app-display'

export type AppAction = 'detail' | 'edit' | 'secret' | 'resetSecret' | 'delete'

const STATUS_ENUM = new Map<AppStatus, ProSchemaValueEnumType>([
  [1, { text: '启用', status: 'Success' }],
  [2, { text: '禁用', status: 'Error' }]
])

/** One field definition shared by the table, search, form and descriptions. */
export const appColumns = [
  { title: '序号', valueType: 'index' },
  {
    title: '应用 ID', dataIndex: 'id', hideInTable: true, hideInForm: true, span: 2,
    render: (_, app) => <CopyableText value={String(app.id)} label="复制 ID" className="break-all" />
  },
  {
    title: '应用名称', dataIndex: 'name', span: 2,
    fieldProps: { maxLength: 100, placeholder: '请输入应用名称，例如：商城接口服务' },
    formItemProps: { rules: z.string().trim().min(1, '应用名称不能为空').max(100, '应用名称长度不能超过 100 个字符') },
    render: dom => <span className="font-medium text-foreground">{dom}</span>
  },
  {
    title: 'Access Key', dataIndex: 'accessKey', hideInForm: true, span: 2,
    render: (_, app, _index, _action, { type }) => type === 'table'
      ? <AccessKeyCell accessKey={app.accessKey} />
      : <CopyableText value={app.accessKey} label="复制 Access Key" successMessage="Access Key 已复制到剪贴板" className="break-all" />
  },
  {
    title: '状态', dataIndex: 'status', valueType: 'switch', valueEnum: STATUS_ENUM, initialValue: 1, order: -1,
    formItemProps: form => ({
      rules: z.literal([1, 2]),
      required: false,
      description: form.getFieldValue('status') === 1 ? '启用后允许调用开放 API 接口' : '禁用后阻止所有调用请求'
    })
  },
  {
    title: '失效时间', dataIndex: 'expireTime', valueType: 'expiry',
    fieldProps: { neverLabel: '永久有效', placeholder: '永久有效（点击设置失效时间）' },
    formItemProps: {
      rules: z.string().refine(value => {
        if (!value) return true
        const date = new Date(value.replace(/-/g, '/'))
        return !Number.isNaN(date.getTime()) && date.getTime() > Date.now()
      }, '失效时间必须是未来时间').transform(value => value || null),
      description: <span className="flex items-center gap-1"><Clock className="size-3" />留空表示永久有效；若设置则必须是未来时间</span>
    },
    render: (_, app) => <ExpireTimeCell expireTime={app.expireTime} />
  },
  {
    title: (_, type) => type === 'table' ? '描述' : '应用描述', dataIndex: 'description', valueType: 'textarea', ellipsis: true, span: 2,
    fieldProps: { rows: 3, maxLength: 200, placeholder: '请输入应用描述信息（选填，最大 200 字）' },
    formItemProps: { rules: z.string().max(200, '描述长度不能超过 200 个字符').transform(value => value || undefined) },
    render: (dom, app, _index, _action, { type }) => type === 'descriptions'
      ? <span className="text-sm whitespace-pre-wrap text-muted-foreground">{app.description || EMPTY_PLACEHOLDER}</span> : dom
  },
  { title: '创建人', dataIndex: 'createUserString', hideInForm: true },
  { title: '创建时间', dataIndex: 'createTime', valueType: 'dateTime', hideInForm: true },
  { title: '修改人', dataIndex: 'updateUserString', hideInForm: true },
  { title: '修改时间', dataIndex: 'updateTime', valueType: 'dateTime', hideInForm: true }
] as const satisfies readonly ProColumns<AppResp>[]

export function createAppColumns(onAction: (action: AppAction, app: AppResp) => void): readonly ProColumns<AppResp>[] {
  return [...appColumns, {
    title: '操作', valueType: 'option',
    render: (_, app) => {
      const disabled = Boolean(app.disabled)
      return [<TableDropdown<AppAction> key="actions" onSelect={action => onAction(action, app)} menus={[
        { key: 'detail', name: '应用详情', icon: <Eye /> },
        { key: 'edit', name: '修改应用', icon: <Pen />, disabled },
        { type: 'divider' },
        { key: 'secret', name: '查看密钥', icon: <KeyRound /> },
        { key: 'resetSecret', name: '重置密钥', icon: <RotateCcw />, disabled },
        { type: 'divider' },
        { key: 'delete', name: '删除', icon: <Trash2 />, danger: true, disabled }
      ]} />]
    }
  }]
}
