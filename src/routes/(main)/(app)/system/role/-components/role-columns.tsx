import { z } from 'zod'
import { Eye, KeyRound, PenLine, ShieldCheck, Trash2, Users } from 'lucide-react'

import { CheckableTree, type CheckableTreeNode } from '@/components/checkable-tree'
import { FlagBadge, TypeBadge, type TypeTone } from '@/components/data-badge'
import { TableDropdown, type ProColumns, type ProValues } from '@/components/pro'
import { Button } from '@/components/ui/button'
import { DATA_SCOPE_MAP, DATA_SCOPE_OPTIONS, type DataScope, type RoleReq, type RoleResp } from '@/lib/api/role'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'

export type RoleAction = 'detail' | 'edit' | 'permission' | 'members' | 'delete'
export interface RoleEntity extends RoleResp {
  deptIds?: Array<string | number>
  deptCheckStrictly?: boolean
}

const DATA_SCOPE_TONES: Record<DataScope, TypeTone> = { 1: 'blue', 2: 'teal', 3: 'teal', 4: 'neutral', 5: 'violet' }
const NAME_PATTERN = /^[\u4e00-\u9fa5a-zA-Z0-9_-]{2,30}$/
const CODE_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{1,29}$/

interface RoleColumnOptions {
  deptTree?: CheckableTreeNode[]
  deptsLoading?: boolean
  deptNames?: ReadonlyMap<string, string>
}

export function roleColumns({ deptTree = [], deptsLoading = false, deptNames }: RoleColumnOptions = {}) {
  return [
    { title: '序号', valueType: 'index' },
    { title: 'ID', dataIndex: 'id', hideInTable: true, hideInForm: true, span: 2 },
    {
      title: '角色名称',
      dataIndex: 'name',
      order: 6,
      fieldProps: { maxLength: 30, placeholder: '请输入角色名称' },
      formItemProps: {
        rules: z
          .string()
          .min(1, '角色名称不能为空')
          .regex(NAME_PATTERN, '角色名称长度为 2-30 个字符，支持中文、字母、数字、下划线、短横线')
          .transform(value => value.trim())
      },
      render: (_, role) => (
        <div className="flex items-center gap-2">
          <span>{role.name}</span>
          <FlagBadge active={role.isSystem} activeLabel="内置" icon={<ShieldCheck />} />
        </div>
      )
    },
    {
      title: '角色编码',
      dataIndex: 'code',
      order: 5,
      fieldProps: (_form, { entity }) => ({
        maxLength: 30,
        placeholder: '请输入角色编码',
        disabled: Boolean(entity?.isSystem)
      }),
      formItemProps: {
        rules: z
          .string()
          .min(1, '角色编码不能为空')
          .regex(CODE_PATTERN, '角色编码长度为 2-30 个字符，支持大小写字母、数字、下划线，且以字母开头')
          .transform(value => value.trim())
      }
    },
    {
      title: '数据权限',
      dataIndex: 'dataScope',
      valueType: 'select',
      initialValue: 1,
      order: 3,
      valueEnum: new Map(DATA_SCOPE_OPTIONS.map(option => [option.value, { text: option.label }])),
      formItemProps: { rules: z.literal([1, 2, 3, 4, 5]), required: false },
      render: (_, role) => <TypeBadge tone={DATA_SCOPE_TONES[role.dataScope]} label={DATA_SCOPE_MAP[role.dataScope]} />
    },
    {
      title: '排序',
      dataIndex: 'sort',
      valueType: 'digit',
      initialValue: 1,
      order: 4,
      fieldProps: { min: 1, inputMode: 'numeric', placeholder: '数值越小越靠前' },
      formItemProps: { rules: z.number({ error: '请输入排序' }).int().min(1, '排序最小值为 1'), required: false }
    },
    {
      title: '描述',
      dataIndex: 'description',
      valueType: 'textarea',
      order: 0,
      span: 2,
      fieldProps: { maxLength: 200, rows: 3, placeholder: '请输入角色描述信息（选填）' },
      formItemProps: {
        rules: z
          .string()
          .max(200, '描述长度不能超过 200 个字符')
          .transform(value => (value ? value.trim() : null))
      },
      render: (dom, role, _index, _action, { type }) =>
        type === 'descriptions' ? (
          <span className="whitespace-pre-wrap">{role.description || EMPTY_PLACEHOLDER}</span>
        ) : (
          dom
        )
    },
    { title: '创建人', dataIndex: 'createUserString', hideInForm: true },
    { title: '创建时间', dataIndex: 'createTime', valueType: 'dateTime', hideInForm: true },
    { title: '修改人', dataIndex: 'updateUserString', hideInForm: true },
    { title: '修改时间', dataIndex: 'updateTime', valueType: 'dateTime', hideInForm: true },
    {
      valueType: 'dependency',
      name: ['dataScope'],
      columns: ({ dataScope }) =>
        dataScope === 5
          ? [
              {
                title: '父子联动',
                dataIndex: 'deptCheckStrictly',
                valueType: 'switch',
                initialValue: false,
                hideInTable: true,
                hideInDescriptions: true,
                order: 2,
                fieldProps: { checkedValue: false, uncheckedValue: true },
                formItemProps: form => ({
                  rules: z.boolean(),
                  required: false,
                  description: form.getFieldValue('deptCheckStrictly')
                    ? '已开启独立选择（不联动）'
                    : '勾选父部门时自动勾选全部子部门'
                })
              },
              {
                title: '选择权限部门',
                dataIndex: 'deptIds',
                initialValue: [],
                hideInTable: true,
                hideInDescriptions: true,
                order: 1,
                convertValue: value => (Array.isArray(value) ? value : []).map(String),
                formItemProps: {
                  rules: z.array(z.union([z.string(), z.number()])).min(1, '自定义数据权限下必须至少选择一个部门')
                },
                formItemRender: (_schema, { id, value, onChange, onBlur, invalid }, form) => (
                  <div
                    id={id}
                    tabIndex={-1}
                    onBlur={onBlur}
                    aria-invalid={invalid}
                    inert={form.isSubmitting}
                    className={form.isSubmitting ? 'pointer-events-none opacity-50' : undefined}
                  >
                    <CheckableTree
                      data={deptTree}
                      checkedKeys={value as Array<string | number>}
                      onCheckedChange={onChange}
                      checkStrictly={Boolean(form.getFieldValue('deptCheckStrictly'))}
                      loading={deptsLoading}
                      searchPlaceholder="搜索部门"
                      emptyText="未找到相关部门"
                    />
                  </div>
                )
              },
              {
                title: '权限部门',
                key: 'scopeDepartments',
                dataIndex: 'deptIds',
                hideInTable: true,
                hideInForm: true,
                span: 2,
                render: (_, role) =>
                  deptsLoading
                    ? '部门加载中…'
                    : (role.deptIds ?? []).map(id => deptNames?.get(String(id)) ?? '部门不可见').join('、') ||
                      EMPTY_PLACEHOLDER
              },
              {
                title: '父子联动',
                key: 'scopeDepartmentLinkage',
                dataIndex: 'deptCheckStrictly',
                hideInTable: true,
                hideInForm: true,
                render: (_, role) => (role.deptCheckStrictly ? '独立选择（不联动）' : '勾选父部门时自动勾选全部子部门')
              }
            ]
          : []
    }
  ] as const satisfies readonly ProColumns<RoleEntity>[]
}

/** The active form schema validates values; non-custom scopes must clear stale department picks. */
export function toRolePayload(values: ProValues): RoleReq {
  const value = values as unknown as RoleReq
  return {
    name: value.name,
    code: value.code,
    sort: value.sort,
    dataScope: value.dataScope,
    description: value.description,
    deptIds: value.dataScope === 5 ? (value.deptIds ?? []) : [],
    deptCheckStrictly: value.dataScope === 5 ? (value.deptCheckStrictly ?? false) : false
  }
}

export interface RoleActionPermissions {
  canGet: boolean
  canUpdate: boolean
  canUpdatePermission: boolean
  canDelete: boolean
}

/** Members stay listed for everyone who can see the page; assigning is gated inside the drawer. */
export function createRoleColumns(
  onAction: (action: RoleAction, role: RoleResp) => void,
  can: RoleActionPermissions
): readonly ProColumns<RoleEntity>[] {
  return [
    ...roleColumns(),
    {
      title: '操作',
      valueType: 'option',
      render: (_, role) => (
        <TableDropdown<RoleAction>
          onSelect={action => onAction(action, role)}
          primary={
            can.canGet && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="角色详情"
                title="角色详情"
                onClick={() => onAction('detail', role)}
              >
                <Eye />
              </Button>
            )
          }
          menus={[
            can.canUpdate && { key: 'edit', name: '修改角色', icon: <PenLine />, disabled: Boolean(role.isSystem) },
            can.canUpdatePermission && {
              key: 'permission',
              name: '功能权限',
              icon: <KeyRound />,
              disabled: Boolean(role.isSystem)
            },
            { key: 'members', name: '关联用户', icon: <Users />, disabled: Boolean(role.isSystem) },
            { type: 'divider' },
            can.canDelete && {
              key: 'delete',
              name: '删除',
              icon: <Trash2 />,
              danger: true,
              disabled: Boolean(role.isSystem)
            }
          ]}
        />
      )
    }
  ]
}
