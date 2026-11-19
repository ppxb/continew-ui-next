import * as React from 'react'

import { Eye, Pen, Trash2 } from 'lucide-react'
import { z } from 'zod'

import { CheckableTree } from '@/components/checkable-tree'
import { CopyableText } from '@/components/copyable-text'
import {
  TableDropdown,
  type ProColumns,
  type ProFieldControlProps,
  type ProFormInstance,
  type ProSchemaValueEnumType
} from '@/components/pro'
import { Switch } from '@/components/ui/switch'
import type { PackageMenuNode, PackageResp } from '@/lib/api/package'

import { packageMenuIdsRule } from './package-menu-values'
import { toMenuTreeNodes } from './use-package-menu-tree'

export interface PackageRecord extends PackageResp {
  menuIds?: (string | number)[]
}

export const PackageMenuContext = React.createContext<{ data: PackageMenuNode[]; loading: boolean }>({
  data: [],
  loading: false
})

const STATUS_ENUM = new Map<number, ProSchemaValueEnumType>([
  [1, { text: '启用', status: 'Success' }],
  [2, { text: '禁用', status: 'Error' }]
])

function PackageMenuField({ control, form }: { control: ProFieldControlProps; form: ProFormInstance }) {
  const menuTree = React.useContext(PackageMenuContext)
  const treeNodes = React.useMemo(() => toMenuTreeNodes(menuTree.data), [menuTree.data])
  return (
    <div
      id={control.id}
      tabIndex={-1}
      aria-invalid={control.invalid}
      inert={control.disabled}
      onBlur={control.onBlur}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground">父子联动</span>
        <Switch
          aria-label="父子联动"
          disabled={control.disabled}
          checked={form.getFieldValue('menuCheckStrictly') === true}
          onCheckedChange={value => form.setFieldsValue({ menuCheckStrictly: value })}
        />
      </div>
      <CheckableTree
        data={treeNodes}
        checkedKeys={control.value as (string | number)[]}
        onCheckedChange={control.onChange}
        checkStrictly={form.getFieldValue('menuCheckStrictly') !== true}
        loading={menuTree.loading}
        searchPlaceholder="搜索菜单或权限名"
        emptyText="暂无菜单"
      />
    </div>
  )
}

export const packageColumns = [
  { title: '序号', valueType: 'index' },
  {
    title: 'ID',
    dataIndex: 'id',
    hideInTable: true,
    hideInForm: true,
    span: 2,
    render: (_, pkg) => <CopyableText value={String(pkg.id)} />
  },
  {
    title: '名称',
    dataIndex: 'name',
    fieldProps: { maxLength: 30, placeholder: '请输入名称' },
    formItemProps: { rules: z.string().trim().min(1, '请输入名称').max(30, '名称长度不能超过 30 个字符') }
  },
  {
    title: '状态',
    dataIndex: 'status',
    valueType: 'switch',
    valueEnum: STATUS_ENUM,
    initialValue: 1,
    search: true,
    align: 'center',
    order: -1,
    formItemProps: form => ({
      required: false,
      rules: z.literal([1, 2]),
      description: form.getFieldValue('status') === 1 ? '启用后租户可以选择该套餐' : '禁用后租户不能再选择该套餐'
    })
  },
  {
    title: '排序',
    dataIndex: 'sort',
    valueType: 'digit',
    initialValue: 999,
    align: 'center',
    fieldProps: { min: 1, step: 1, placeholder: '请输入排序' },
    formItemProps: {
      rules: z
        .number({ error: issue => (issue.input === null ? '请输入排序' : undefined) })
        .int('请输入大于 0 的整数')
        .min(1, '请输入大于 0 的整数')
    }
  },
  {
    title: '描述',
    dataIndex: 'description',
    valueType: 'textarea',
    span: 2,
    fieldProps: { rows: 3, maxLength: 200, placeholder: '请输入描述' },
    formItemProps: {
      rules: z
        .string()
        .max(200, '描述长度不能超过 200 个字符')
        .transform(value => value.trim() || undefined)
    }
  },
  { title: '创建人', dataIndex: 'createUserString', hideInForm: true },
  { title: '创建时间', dataIndex: 'createTime', valueType: 'dateTime', hideInForm: true },
  { title: '修改人', dataIndex: 'updateUserString', hideInForm: true },
  { title: '修改时间', dataIndex: 'updateTime', valueType: 'dateTime', hideInForm: true },
  {
    title: '父子联动',
    dataIndex: 'menuCheckStrictly',
    valueType: 'switch',
    initialValue: true,
    hideInTable: true,
    hideInDescriptions: true,
    ignoreFormItem: true,
    formItemProps: { rules: z.boolean() },
    formItemRender: () => null
  },
  {
    title: '关联菜单',
    dataIndex: 'menuIds',
    initialValue: [],
    order: -2,
    hideInTable: true,
    hideInDescriptions: true,
    convertValue: value => (Array.isArray(value) ? value.map(String) : []),
    formItemProps: { rules: packageMenuIdsRule, description: '勾选的菜单会授权给该套餐下的所有租户' },
    formItemRender: (_, control, form) => <PackageMenuField control={control} form={form} />
  }
] as const satisfies readonly ProColumns<PackageRecord>[]

export type PackageAction = 'detail' | 'edit' | 'delete'

interface PackageColumnOptions {
  readonly canGet: boolean
  readonly canUpdate: boolean
  readonly canDelete: boolean
  readonly onAction: (action: PackageAction, pkg: PackageResp) => void
}

export function createPackageColumns({
  canGet,
  canUpdate,
  canDelete,
  onAction
}: PackageColumnOptions): readonly ProColumns<PackageRecord>[] {
  if (!canGet && !canUpdate && !canDelete) return packageColumns
  return [
    ...packageColumns,
    {
      title: '操作',
      valueType: 'option',
      align: 'center',
      render: (_, pkg) => (
        <TableDropdown<PackageAction>
          onSelect={action => onAction(action, pkg)}
          menus={[
            canGet && { key: 'detail', name: '详情', icon: <Eye /> },
            canUpdate && { key: 'edit', name: '修改', icon: <Pen /> },
            { type: 'divider' },
            canDelete && {
              key: 'delete',
              name: '删除',
              icon: <Trash2 />,
              danger: true,
              disabled: Boolean(pkg.disabled)
            }
          ]}
        />
      )
    }
  ]
}
