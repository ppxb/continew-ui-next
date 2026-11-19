import { Pencil, Trash2 } from 'lucide-react'
import { z } from 'zod'
import { cn } from 'cn'

import { TableDropdown, type ProColumns, type ProSchemaValueEnumType } from '@/components/pro'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { DictItemResp, DictResp } from '@/lib/api/dict'

import { DICT_COLOR_DOT_CLASSES, DICT_COLOR_OPTIONS, DictLabelBadge } from './dict-display'

const STATUS_ENUM = new Map<number, ProSchemaValueEnumType>([
  [1, { text: '启用', status: 'Success' }],
  [2, { text: '禁用', status: 'Error' }]
])

export const dictColumns = [
  {
    title: '名称',
    dataIndex: 'name',
    fieldProps: { maxLength: 30, autoComplete: 'off', placeholder: '请输入字典名称' },
    formItemProps: {
      rules: z
        .string()
        .trim()
        .regex(/^[一-龥a-zA-Z0-9_-]{2,30}$/, '名称长度为 2-30 个字符，支持中文、字母、数字、下划线、短横线')
    }
  },
  {
    title: '编码',
    dataIndex: 'code',
    fieldProps: form => ({
      maxLength: 30,
      autoComplete: 'off',
      placeholder: '请输入字典编码',
      disabled: form?.getFieldValue('id') != null
    }),
    formItemProps: form => ({
      rules: z
        .string()
        .trim()
        .regex(/^[a-zA-Z][a-zA-Z0-9_]{1,29}$/, '编码长度为 2-30 个字符，以字母开头，支持字母、数字、下划线'),
      description: form.getFieldValue('id') != null ? '编码创建后不可修改' : undefined
    })
  },
  {
    title: '描述',
    dataIndex: 'description',
    valueType: 'textarea',
    span: 2,
    fieldProps: { rows: 3, maxLength: 200, placeholder: '请输入描述' },
    formItemProps: { className: 'sm:col-span-2', rules: z.string().trim().max(200, '描述长度不能超过 200 个字符') }
  }
] as const satisfies readonly ProColumns<DictResp>[]

export const dictItemColumns = [
  { title: '序号', valueType: 'index' },
  {
    title: '标签',
    dataIndex: 'label',
    fieldProps: { maxLength: 30, autoComplete: 'off', placeholder: '请输入标签' },
    formItemProps: { rules: z.string().trim().min(1, '请输入标签').max(30, '标签长度不能超过 30 个字符') },
    render: (_, item) => <DictLabelBadge label={item.label} color={item.color} />
  },
  {
    title: '值',
    dataIndex: 'value',
    fieldProps: { maxLength: 30, autoComplete: 'off', placeholder: '请输入值' },
    formItemProps: { rules: z.string().trim().min(1, '请输入值').max(30, '值长度不能超过 30 个字符') }
  },
  {
    title: '颜色',
    dataIndex: 'color',
    valueType: 'select',
    hideInTable: true,
    hideInDescriptions: true,
    initialValue: 'none',
    convertValue: value => value || 'none',
    formItemProps: {
      description: '仅影响列表里标签的展示颜色',
      rules: z.string().transform(value => (value && value !== 'none' ? value : undefined))
    },
    formItemRender: (_, control) => (
      <Select
        items={DICT_COLOR_OPTIONS}
        value={String(control.value ?? 'none')}
        disabled={control.disabled}
        onValueChange={value => control.onChange(value ?? 'none')}
      >
        <SelectTrigger id={control.id} onBlur={control.onBlur} aria-invalid={control.invalid} className="w-full">
          <SelectValue placeholder="请选择颜色" />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            {DICT_COLOR_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.value === 'none' ? (
                  option.label
                ) : (
                  <span className="flex items-center gap-2">
                    <span className={cn('size-2 rounded-full', DICT_COLOR_DOT_CLASSES[option.value])} />
                    {option.label}
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    )
  },
  {
    title: '状态',
    dataIndex: 'status',
    valueType: 'switch',
    valueEnum: STATUS_ENUM,
    initialValue: 1,
    order: -1,
    formItemProps: form => ({
      className: 'sm:col-span-2',
      required: false,
      rules: z.literal([1, 2]),
      description: form.getFieldValue('status') === 1 ? '启用后该字典项会返回给前端' : '禁用后该字典项不会返回给前端'
    })
  },
  {
    title: '排序',
    dataIndex: 'sort',
    valueType: 'digit',
    initialValue: 999,
    fieldProps: { min: 1, step: 1 },
    formItemProps: {
      rules: z
        .number({ error: issue => (issue.input === null ? '请输入排序' : undefined) })
        .int('排序必须是不小于 1 的整数')
        .min(1, '排序必须是不小于 1 的整数')
    }
  },
  {
    title: '描述',
    dataIndex: 'description',
    valueType: 'textarea',
    fieldProps: { rows: 3, maxLength: 200, placeholder: '请输入描述' },
    formItemProps: { className: 'sm:col-span-2', rules: z.string().trim().max(200, '描述长度不能超过 200 个字符') }
  },
  { title: '创建时间', dataIndex: 'createTime', valueType: 'dateTime', hideInForm: true }
] as const satisfies readonly ProColumns<DictItemResp>[]

export type DictItemAction = 'update' | 'delete'

interface DictItemColumnOptions {
  readonly canUpdate: boolean
  readonly canDelete: boolean
  readonly onAction: (action: DictItemAction, item: DictItemResp) => void
}

export function createDictItemColumns({
  canUpdate,
  canDelete,
  onAction
}: DictItemColumnOptions): readonly ProColumns<DictItemResp>[] {
  if (!canUpdate && !canDelete) return dictItemColumns
  return [
    ...dictItemColumns,
    {
      title: '操作',
      valueType: 'option',
      align: 'center',
      render: (_, item) => (
        <TableDropdown<DictItemAction>
          onSelect={action => onAction(action, item)}
          menus={[
            canUpdate && { key: 'update', name: '修改', icon: <Pencil /> },
            { type: 'divider' },
            canDelete && { key: 'delete', name: '删除', icon: <Trash2 />, danger: true }
          ]}
        />
      )
    }
  ]
}
