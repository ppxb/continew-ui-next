import { useQuery } from '@tanstack/react-query'
import { Eye, KeyRound, Pen, ShieldCheck, Trash2 } from 'lucide-react'

import { FlagBadge, TagList } from '@/components/data-badge'
import { CopyableText } from '@/components/copyable-text'
import { SensitiveText } from '@/components/sensitive-text'
import { DeptName, DeptTreeSelect } from '@/components/dept-tree-select'
import { FilterSelect } from '@/components/filter-select'
import { TableDropdown, type ProColumns, type ProSchemaValueEnumType } from '@/components/pro'
import { QueryState } from '@/components/query-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { deptKeys, getDeptTree } from '@/lib/api/dept'
import type { UserResp, UserStatus } from '@/lib/api/user'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'
import { PASSWORD_HINT } from '@/lib/password'
import { hasPermission } from '@/lib/permission'
import { getInitials } from '@/lib/utils'

import { genderLabel } from './user-display'
import { userRules } from './user-form-values'
import { UserRoleSelect } from './user-role-select'

export type UserAction = 'detail' | 'edit' | 'resetPassword' | 'assignRoles' | 'delete'

function NicknameCell({ user }: { user: UserResp }) {
  const name = user.nickname || user.username

  return (
    <div className="flex items-center gap-2">
      <Avatar>
        <AvatarImage src={user.avatar ?? undefined} />
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>
      <span className="max-w-56 min-w-0 truncate" title={name}>
        {name}
      </span>
    </div>
  )
}

function RowActions({
  user,
  onAction,
  permissions
}: {
  user: UserResp
  onAction: (action: UserAction, user: UserResp) => void
  permissions: readonly string[]
}) {
  const isLocked = Boolean(user.disabled)
  const canResetPassword = hasPermission(permissions, 'system:user:resetPwd')
  const canAssignRoles = hasPermission(permissions, 'system:user:updateRole')

  return (
    <TableDropdown<UserAction>
      onSelect={action => onAction(action, user)}
      primary={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="用户详情"
          title="用户详情"
          onClick={() => onAction('detail', user)}
        >
          <Eye />
        </Button>
      }
      menus={[
        hasPermission(permissions, 'system:user:update') && {
          key: 'edit',
          name: '修改用户',
          icon: <Pen />,
          disabled: isLocked
        },
        { type: 'divider' },
        canResetPassword && { key: 'resetPassword', name: '重置密码', icon: <KeyRound />, disabled: isLocked },
        canAssignRoles && { key: 'assignRoles', name: '分配角色', icon: <ShieldCheck />, disabled: isLocked },
        { type: 'divider' },
        hasPermission(permissions, 'system:user:delete') && {
          key: 'delete',
          name: '删除',
          icon: <Trash2 />,
          danger: true,
          disabled: isLocked
        }
      ]}
    />
  )
}

export type UserRecord = UserResp & { password?: string }

const STATUS_ENUM = new Map<UserStatus, ProSchemaValueEnumType>([
  [1, { text: '启用', status: 'Success' }],
  [2, { text: '禁用', status: 'Error' }]
])

function UserDeptField({
  id,
  value,
  onChange,
  invalid,
  disabled
}: {
  id: string
  value: unknown
  onChange: (value: unknown) => void
  invalid: boolean
  disabled?: boolean
}) {
  const depts = useQuery({ queryKey: deptKeys.trees(), queryFn: ({ signal }) => getDeptTree(undefined, signal) })
  return (
    <>
      <DeptTreeSelect
        id={id}
        data={depts.data}
        loading={depts.isPending}
        disabled={disabled || depts.isPending || depts.isError}
        value={typeof value === 'string' ? value : ''}
        onChange={onChange}
        invalid={invalid}
      />
      {depts.isError ? (
        <QueryState state="error" title="部门加载失败" onRetry={() => void depts.refetch()} className="p-2" />
      ) : null}
    </>
  )
}

/** Shared field definitions for the list, inline search, drawer form and details. */
export const userColumns = [
  { title: '序号', valueType: 'index', fixed: 'left' },
  {
    title: 'ID',
    dataIndex: 'id',
    hideInTable: true,
    hideInForm: true,
    span: 2,
    render: (_, user) => <CopyableText value={String(user.id)} label="复制 ID" />
  },
  {
    title: '昵称',
    dataIndex: 'nickname',
    fixed: 'left',
    order: 10,
    fieldProps: { maxLength: 30, placeholder: '请输入昵称' },
    formItemProps: { rules: userRules.nickname },
    render: (dom, user, _index, _action, { type }) => (type === 'table' ? <NicknameCell user={user} /> : dom)
  },
  {
    title: '用户名',
    dataIndex: 'username',
    order: 9,
    fieldProps: { maxLength: 64, placeholder: '请输入用户名', autoComplete: 'off' },
    formItemProps: { rules: userRules.username }
  },
  {
    title: '密码',
    dataIndex: 'password',
    valueType: 'password',
    hideInTable: true,
    hideInDescriptions: true,
    order: 8,
    fieldProps: { maxLength: 32, placeholder: '请输入密码', autoComplete: 'new-password' },
    formItemProps: { rules: userRules.password, description: PASSWORD_HINT, hideDescriptionOnError: true }
  },
  {
    title: '所属部门',
    dataIndex: 'deptId',
    hideInTable: true,
    hideInDescriptions: true,
    initialValue: '',
    order: 4,
    search: {
      transform: value => ({ deptId: value || undefined }),
      renderValue: value => <DeptName id={value as string} />
    },
    convertValue: value => (value == null ? '' : String(value)),
    formItemProps: { rules: userRules.deptId },
    formItemRender: (_schema, control) =>
      control.type === 'table' ? (
        <DeptTreeSelect
          id={control.id}
          triggerPrefix={control.labelled ? undefined : '部门'}
          placeholder="全部部门"
          placeholderColor="foreground"
          showAllOption
          allOptionLabel="全部部门"
          value={typeof control.value === 'string' || typeof control.value === 'number' ? control.value : undefined}
          onChange={control.onChange}
          className={control.labelled ? 'w-full' : 'sm:w-44'}
        />
      ) : (
        <UserDeptField {...control} />
      )
  },
  {
    title: '状态',
    dataIndex: 'status',
    valueType: 'switch',
    valueEnum: STATUS_ENUM,
    initialValue: 1,
    search: { inline: true, transform: value => ({ status: value === 1 || value === 2 ? value : undefined }) },
    order: -1,
    formItemProps: form => ({
      rules: userRules.status,
      required: false,
      description: form.getFieldValue('status') === 1 ? '启用后该用户可以登录' : '禁用后该用户无法登录'
    }),
    formItemRender: (_schema, control) =>
      control.type === 'table' ? (
        <FilterSelect
          label="状态"
          options={[
            { value: 'all', label: '全部' },
            { value: '1', label: '启用' },
            { value: '2', label: '禁用' }
          ]}
          value={control.value === 1 || control.value === 2 ? String(control.value) : 'all'}
          onValueChange={value => control.onChange(value === '1' ? 1 : value === '2' ? 2 : undefined)}
          className="sm:w-32"
        />
      ) : (
        control.defaultRender()
      )
  },
  {
    title: '性别',
    dataIndex: 'gender',
    valueType: 'select',
    initialValue: 1,
    order: 5,
    valueEnum: new Map(([0, 1, 2] as const).map(value => [value, { text: genderLabel(value) }])),
    formItemProps: { rules: userRules.gender, required: false }
  },
  { title: '所属部门', dataIndex: 'deptName', hideInForm: true },
  {
    title: '角色',
    dataIndex: 'roleNames',
    hideInForm: true,
    render: (_, user, _index, _action, { type }) => (
      <TagList items={user.roleNames} max={type === 'table' ? 1 : undefined} />
    )
  },
  {
    title: '角色',
    dataIndex: 'roleIds',
    hideInTable: true,
    hideInDescriptions: true,
    initialValue: [],
    order: 3,
    convertValue: (_value, _field, user) => user.roleIds.map(String),
    formItemProps: { rules: userRules.roleIds },
    formItemRender: (_schema, control) => (
      <UserRoleSelect
        id={control.id}
        value={control.value as string[]}
        onChange={control.onChange}
        invalid={control.invalid}
        disabled={control.disabled}
      />
    )
  },
  {
    title: (_, type) => (type === 'form' ? '手机号码' : '手机号'),
    dataIndex: 'phone',
    // 详情接口返回明文才需要前端脱敏；列表接口已是脱敏值，保持原样。
    render: (dom, user, _index, _action, { type }) =>
      type === 'descriptions' ? <SensitiveText value={user.phone} type="phone" /> : dom,
    order: 7,
    fieldProps: { type: 'tel', maxLength: 14, placeholder: '请输入手机号码', autoComplete: 'off' },
    formItemProps: { rules: userRules.phone }
  },
  {
    title: '邮箱',
    dataIndex: 'email',
    render: (dom, user, _index, _action, { type }) =>
      type === 'descriptions' ? <SensitiveText value={user.email} type="email" /> : dom,
    order: 6,
    fieldProps: { type: 'email', maxLength: 255, placeholder: '请输入邮箱地址', autoComplete: 'off' },
    formItemProps: { rules: userRules.email }
  },
  {
    title: '系统内置',
    dataIndex: 'isSystem',
    hideInForm: true,
    hideInDescriptions: true,
    render: (_, user) => <FlagBadge active={user.isSystem} activeLabel="内置" inactiveLabel="自定义" />
  },
  {
    title: '描述',
    dataIndex: 'description',
    valueType: 'textarea',
    span: 2,
    order: 2,
    ellipsis: true,
    fieldProps: { rows: 3, maxLength: 200, placeholder: '请输入描述信息' },
    formItemProps: { rules: userRules.description },
    render: (dom, user, _index, _action, { type }) =>
      type === 'descriptions' ? (
        <span className="whitespace-pre-wrap">{user.description || EMPTY_PLACEHOLDER}</span>
      ) : (
        dom
      )
  },
  { title: '创建人', dataIndex: 'createUserString', hideInForm: true },
  { title: '创建时间', dataIndex: 'createTime', valueType: 'dateTime', hideInForm: true },
  { title: '修改人', dataIndex: 'updateUserString', hideInForm: true },
  { title: '修改时间', dataIndex: 'updateTime', valueType: 'dateTime', hideInForm: true },
  // Search only: UserQuery.createTime takes a "start,end" range.
  {
    title: '创建时间',
    key: 'createTimeRange',
    dataIndex: 'createTime',
    valueType: 'dateTimeRange',
    hideInTable: true,
    hideInForm: true,
    hideInDescriptions: true,
    search: { transform: value => ({ createTime: Array.isArray(value) ? value.join(',') : undefined }) }
  }
] as const satisfies readonly ProColumns<UserRecord>[]

export function getUserFormColumns(isCreate: boolean): readonly ProColumns<UserRecord>[] {
  return userColumns.map(column =>
    'dataIndex' in column && column.dataIndex === 'password' ? { ...column, hideInForm: !isCreate } : column
  )
}

export function createUserColumns(
  onAction: (action: UserAction, user: UserResp) => void,
  permissions: readonly string[]
): readonly ProColumns<UserRecord>[] {
  return [
    ...userColumns,
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      render: (_, user) => <RowActions user={user} onAction={onAction} permissions={permissions} />
    }
  ]
}
