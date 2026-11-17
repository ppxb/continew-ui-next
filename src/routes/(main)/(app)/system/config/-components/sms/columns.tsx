import { z } from 'zod'
import { Star, Trash2 } from 'lucide-react'

import { CopyableText } from '@/components/copyable-text'
import { FilterSelect } from '@/components/filter-select'
import type { ProColumns } from '@/components/pro'
import { RowActionsMenu } from '@/components/row-actions-menu'
import { DefaultBadge, StatusCell } from '@/components/status-cell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenuGroup, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { usePermission } from '@/hooks/use-permission'
import type { SmsConfigReq, SmsConfigResp } from '@/lib/api/sms'

import { type DictOption, toLabelMap } from '../use-dict-options'

export type SmsAction = 'edit' | 'setDefault' | 'delete'

function RowActions({
  record,
  onAction
}: {
  record: SmsConfigResp
  onAction: (action: SmsAction, record: SmsConfigResp) => void
}) {
  const { hasPermission } = usePermission()
  const canSetDefault = hasPermission('system:smsConfig:setDefault')
  const canDelete = hasPermission('system:smsConfig:delete')

  return (
    <div className="flex items-center justify-end gap-1">
      {hasPermission('system:smsConfig:update') && (
        <Button size="sm" variant="ghost" onClick={() => onAction('edit', record)}>
          修改
        </Button>
      )}

      {(canSetDefault || canDelete) && (
        <RowActionsMenu>
          <DropdownMenuGroup>
            {canSetDefault && !record.isDefault && (
              <DropdownMenuItem onClick={() => onAction('setDefault', record)}>
                <Star className="size-4" />
                设为默认
              </DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem variant="destructive" onClick={() => onAction('delete', record)}>
                <Trash2 className="size-4" />
                删除
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        </RowActionsMenu>
      )}
    </div>
  )
}

export interface SmsColumnOptions {
  readonly supplierOptions: DictOption[]
  readonly onSupplierChange: (supplier: string | undefined) => void
  readonly onAction: (action: SmsAction, record: SmsConfigResp) => void
}

export interface SmsSubmitValues {
  name: string
  supplier: string
  accessKey: string
  secretKey?: string
  signature?: string
  templateId: string
  weight: number
  retryInterval: number
  maxRetries: number
  maximum: number
  supplierConfig?: string
  status: 1 | 2
}

/** Keep the original API contract: an empty edit secret is omitted, not encrypted here. */
export function toSmsPayload(value: SmsSubmitValues): SmsConfigReq {
  return {
    name: value.name,
    supplier: value.supplier,
    accessKey: value.accessKey,
    secretKey: value.secretKey ?? undefined!,
    signature: value.signature,
    templateId: value.templateId,
    weight: value.weight,
    retryInterval: value.retryInterval,
    maxRetries: value.maxRetries,
    maximum: value.maximum,
    supplierConfig: value.supplierConfig,
    status: value.status
  }
}

/** One configuration supplies table, search and the two-column drawer form. */
export function createSmsColumns(options: SmsColumnOptions): readonly ProColumns<SmsConfigResp>[] {
  const { supplierOptions, onSupplierChange, onAction } = options
  const supplierMap = toLabelMap(supplierOptions)
  return [
    { title: '序号', valueType: 'index' },
    {
      title: '配置名称', dataIndex: 'name', hideInSetting: true,
      fieldProps: { maxLength: 100, placeholder: '请输入配置名称' },
      formItemProps: { rules: z.string().trim().min(1, '请输入配置名称').max(100, '配置名称不能超过 100 个字符') },
      render: (_, record) => <span className="font-medium text-foreground">{record.name}</span>
    },
    {
      title: '服务厂商', dataIndex: 'supplier', valueType: 'select', search: true, valueEnum: supplierMap,
      initialValue: supplierOptions[0]?.value || 'alibaba',
      convertValue: value => value ?? (supplierOptions[0]?.value || 'alibaba'),
      fieldProps: { placeholder: '请选择服务厂商' }, formItemProps: { rules: z.string().min(1, '请选择服务厂商') },
      formItemRender: (_schema, control) => control.type === 'table' ? <FilterSelect
        label="厂商" options={[{ value: 'all', label: '全部' }, ...supplierOptions]}
        value={typeof control.value === 'string' ? control.value : 'all'}
        onValueChange={value => {
          const next = !value || value === 'all' ? undefined : value
          control.onChange(next)
          onSupplierChange(next)
        }} className="w-full sm:w-32"
      /> : control.defaultRender(),
      render: (_, record) => <Badge variant="outline">{supplierMap[record.supplier] || record.supplier}</Badge>
    },
    {
      title: 'Access Key', dataIndex: 'accessKey',
      fieldProps: { maxLength: 255, placeholder: '请输入 Access Key' },
      formItemProps: { className: 'sm:col-span-2', rules: z.string().trim().min(1, '请输入 Access Key').max(255, 'Access Key 不能超过 255 个字符') },
      render: (_, record) => <CopyableText value={record.accessKey} className="max-w-35 truncate text-xs" />
    },
    {
      title: 'Secret Key', dataIndex: 'secretKey', valueType: 'password', hideInTable: true, hideInDescriptions: true,
      convertValue: () => '',
      fieldProps: (_form, schema) => ({ maxLength: 255, placeholder: schema.entity ? '留空表示不修改' : '请输入 Secret Key' }),
      formItemProps: (_form, schema) => ({
        required: !schema.entity, className: 'sm:col-span-2',
        rules: z.string().max(255, 'Secret Key 不能超过 255 个字符').refine(value => !!schema.entity || !!value.trim(), '请输入 Secret Key').transform(value => value.trim() || undefined)
      })
    },
    {
      title: '短信签名', dataIndex: 'signature',
      fieldProps: { maxLength: 100, placeholder: '请输入短信签名' },
      formItemProps: { rules: z.string().max(100, '短信签名不能超过 100 个字符').transform(value => value.trim() || undefined) },
      render: (_, record) => <span className="text-sm">{record.signature || '-'}</span>
    },
    {
      title: '模板 ID', dataIndex: 'templateId',
      fieldProps: { maxLength: 50, placeholder: '请输入模板 ID' },
      formItemProps: { rules: z.string().trim().min(1, '请输入模板 ID').max(50, '模板 ID 不能超过 50 个字符') },
      render: (_, record) => <span className="text-xs">{record.templateId}</span>
    },
    {
      title: (_, type) => type === 'form' ? '负载均衡权重' : '权重', dataIndex: 'weight', valueType: 'digit', initialValue: 1, align: 'center',
      fieldProps: { min: 1, max: 100 },
      formItemProps: { required: false, rules: z.number('请输入负载均衡权重').int('权重必须为整数').min(1, '权重最小为 1').max(100, '权重最大为 100').nullable().refine(value => value !== null, '请输入负载均衡权重').transform(value => value!) },
      render: (_, record) => <span className="text-xs">{record.weight ?? 1}</span>
    },
    {
      title: '重试间隔', dataIndex: 'retryInterval', valueType: 'digit', hideInTable: true, initialValue: 5,
      fieldProps: { min: 1, addonEnd: '秒' },
      formItemProps: { required: false, rules: z.number('请输入重试间隔').int('重试间隔必须为整数').min(1, '重试间隔最小为 1 秒').nullable().refine(value => value !== null, '请输入重试间隔').transform(value => value!) }
    },
    {
      title: '重试次数', dataIndex: 'maxRetries', valueType: 'digit', hideInTable: true, initialValue: 0,
      fieldProps: { min: 0 },
      formItemProps: { required: false, rules: z.number('请输入重试次数').int('重试次数必须为整数').min(0, '重试次数最小为 0').nullable().refine(value => value !== null, '请输入重试次数').transform(value => value!) }
    },
    {
      title: '发送上限', dataIndex: 'maximum', valueType: 'digit', hideInTable: true, initialValue: 100,
      fieldProps: { min: 1 },
      formItemProps: { required: false, rules: z.number('请输入发送上限').int('发送上限必须为整数').min(1, '发送上限最小为 1').nullable().refine(value => value !== null, '请输入发送上限').transform(value => value!) }
    },
    {
      title: '厂商独立扩展配置', dataIndex: 'supplierConfig', valueType: 'textarea', hideInTable: true,
      fieldProps: { rows: 2, maxLength: 500, placeholder: '请输入厂商的（JSON 格式）扩展配置' },
      formItemProps: {
        className: 'sm:col-span-2', description: '针对特定供应商（如腾讯云 sdkAppId）的专有扩展参数',
        rules: z.string().refine(value => {
          if (!value.trim()) return true
          try { JSON.parse(value); return true } catch { return false }
        }, '扩展配置必须为合法的 JSON 格式').transform(value => value.trim() || undefined)
      }
    },
    {
      title: '状态', dataIndex: 'status', valueType: 'switch', initialValue: 1, order: -1, align: 'center',
      formItemProps: { rules: z.literal([1, 2]), required: false, description: '禁用后该通道将不再参与短信发送', className: 'sm:col-span-2' },
      render: (_, record) => <div className="flex justify-center"><StatusCell status={record.status} /></div>
    },
    {
      title: '默认', dataIndex: 'isDefault', hideInForm: true, align: 'center',
      render: (_, record) => <div className="flex justify-center">{record.isDefault ? <DefaultBadge /> : <span className="text-xs text-muted-foreground">否</span>}</div>
    },
    { title: '修改时间', dataIndex: 'updateTime', valueType: 'dateTime', hideInForm: true, render: (_, record) => <span className="text-xs text-muted-foreground">{record.updateTime || '-'}</span> },
    { title: '创建时间', dataIndex: 'createTime', valueType: 'dateTime', hideInForm: true, render: (_, record) => <span className="text-xs text-muted-foreground">{record.createTime || '-'}</span> },
    { title: '操作', valueType: 'option', align: 'right', render: (_, record) => <RowActions record={record} onAction={onAction} /> }
  ]
}
