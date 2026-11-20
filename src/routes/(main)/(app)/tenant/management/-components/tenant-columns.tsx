import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Eye, KeyRound, PackageOpen, Pen, Trash2 } from 'lucide-react'

import { CopyableText } from '@/components/copyable-text'
import { FilterSelect } from '@/components/filter-select'
import { type ProColumns, type ProSchemaValueEnumType } from '@/components/pro'
import { RowActionsMenu } from '@/components/row-actions-menu'
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { listPackageDict, packageKeys } from '@/lib/api/package'
import type { TenantResp, TenantStatus } from '@/lib/api/tenant'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'
import { PASSWORD_HINT } from '@/lib/password'

import { DomainCell, ExpireTimeCell } from './tenant-display'
import { tenantRules } from './tenant-form-values'

/** The row actions the table raises. */
export type TenantAction = 'detail' | 'edit' | 'adminPassword' | 'delete'

interface TenantColumnOptions {
  readonly canGet: boolean
  readonly canUpdate: boolean
  readonly canUpdateAdminPassword: boolean
  readonly canDelete: boolean
  readonly onAction: (action: TenantAction, tenant: TenantResp) => void
}

type RowActionsProps = TenantColumnOptions & { readonly tenant: TenantResp }

function RowActions({ tenant, canGet, canUpdate, canUpdateAdminPassword, canDelete, onAction }: RowActionsProps) {
  const hasPrimary = canGet || canUpdate
  const hasSecondary = canUpdateAdminPassword || canDelete

  return (
    <div className="flex items-center justify-center">
      <RowActionsMenu>
        {hasPrimary ? (
          <DropdownMenuGroup>
            {canGet ? (
              <DropdownMenuItem onClick={() => onAction('detail', tenant)}>
                <Eye />
                详情
              </DropdownMenuItem>
            ) : null}
            {canUpdate ? (
              <DropdownMenuItem onClick={() => onAction('edit', tenant)}>
                <Pen />
                修改
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuGroup>
        ) : null}
        {hasPrimary && hasSecondary ? <DropdownMenuSeparator /> : null}
        {hasSecondary ? (
          <DropdownMenuGroup>
            {canUpdateAdminPassword ? (
              <DropdownMenuItem onClick={() => onAction('adminPassword', tenant)}>
                <KeyRound />
                修改管理员密码
              </DropdownMenuItem>
            ) : null}
            {canDelete ? (
              <DropdownMenuItem
                variant="destructive"
                disabled={Boolean(tenant.disabled)}
                onClick={() => onAction('delete', tenant)}
              >
                <Trash2 />
                删除
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuGroup>
        ) : null}
      </RowActionsMenu>
    </div>
  )
}

export type TenantRecord = TenantResp & { adminPassword?: string }

const STATUS_ENUM = new Map<TenantStatus, ProSchemaValueEnumType>([
  [1, { text: '启用', status: 'Success' }],
  [2, { text: '禁用', status: 'Error' }]
])

/** A package's name from the package dictionary, for the applied 套餐 filter tag. */
function PackageName({ id }: { readonly id: unknown }) {
  const packages = useQuery({ queryKey: packageKeys.dicts(), queryFn: ({ signal }) => listPackageDict(signal) })
  return packages.data?.find(option => String(option.value) === String(id))?.label ?? String(id)
}

function TenantPackageField({
  id,
  value,
  onChange,
  invalid,
  search,
  disabled,
  onBlur
}: {
  id: string
  value: unknown
  onChange: (value: unknown) => void
  onBlur: () => void
  invalid: boolean
  search: boolean
  disabled?: boolean
}) {
  const packages = useQuery({ queryKey: packageKeys.dicts(), queryFn: ({ signal }) => listPackageDict(signal) })
  const options = packages.data ?? []
  const items = options.map(option => ({ value: String(option.value), label: option.label }))
  if (search)
    return (
      <FilterSelect
        label="套餐"
        options={[{ value: 'all', label: '全部' }, ...items]}
        value={typeof value === 'string' ? value : 'all'}
        onValueChange={next => onChange(!next || next === 'all' ? undefined : next)}
        className="w-full sm:w-40"
      />
    )
  if (packages.isPending) return <Skeleton className="h-8 w-full" />
  if (!options.length)
    return (
      <Empty className="min-h-28 border border-dashed p-4">
        <EmptyHeader>
          <EmptyMedia>
            <PackageOpen />
          </EmptyMedia>
          <EmptyTitle>{packages.isError ? '套餐加载失败' : '暂无可用套餐'}</EmptyTitle>
          <EmptyDescription>
            {packages.isError ? (
              '请关闭抽屉后重新打开重试'
            ) : (
              <>
                {'请先在「'}
                <Button
                  nativeButton={false}
                  variant="link"
                  className="h-auto p-0 align-baseline text-sm font-normal"
                  render={<Link to="/tenant/package" />}
                >
                  套餐管理
                </Button>
                {'」中创建并启用套餐'}
              </>
            )}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  return (
    <Select
      items={items}
      value={typeof value === 'string' ? value : ''}
      onValueChange={next => onChange(next ?? '')}
      disabled={disabled}
    >
      <SelectTrigger id={id} onBlur={onBlur} className="w-full" aria-invalid={invalid}>
        <SelectValue placeholder="请选择套餐" />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectGroup>
          {items.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

/** Shared field definitions for the list, inline search, drawer form and details. */
export const tenantColumns = [
  { title: '序号', valueType: 'index', fixed: 'left' },
  {
    title: 'ID',
    dataIndex: 'id',
    hideInTable: true,
    hideInForm: true,
    render: (_, tenant) => <CopyableText value={String(tenant.id)} />
  },
  {
    title: '编码',
    dataIndex: 'code',
    hideInForm: true,
    search: true,
    fieldProps: { placeholder: '编码' },
    render: (_, tenant) => <CopyableText value={tenant.code} />
  },
  {
    title: '名称',
    dataIndex: 'name',
    order: 7,
    fieldProps: { maxLength: 30, placeholder: '请输入租户名称' },
    formItemProps: { rules: tenantRules.name }
  },
  { title: '套餐', dataIndex: 'packageName', hideInForm: true },
  {
    title: '套餐',
    dataIndex: 'packageId',
    hideInTable: true,
    hideInDescriptions: true,
    order: 2,
    initialValue: '',
    search: {
      transform: value => ({ packageId: value || undefined }),
      renderValue: value => <PackageName id={value} />
    },
    convertValue: value => (value == null ? '' : String(value)),
    formItemProps: { rules: tenantRules.packageId.min(1, '请选择套餐') },
    formItemRender: (_schema, control) => <TenantPackageField {...control} search={control.type === 'table'} />
  },
  {
    title: '域名',
    dataIndex: 'domain',
    order: 6,
    search: true,
    // The form edits a bare host behind an `http(s)://` addon; the filter matches any part of it.
    fieldProps: (_form, { type }) =>
      type === 'table'
        ? { placeholder: '域名' }
        : { addonStart: 'http(s)://', maxLength: 255, placeholder: '请输入需要绑定的域名' },
    formItemProps: { rules: tenantRules.domain },
    render: (_, tenant) => <DomainCell domain={tenant.domain} />
  },
  {
    title: '过期时间',
    dataIndex: 'expireTime',
    valueType: 'expiry',
    order: 5,
    formItemProps: {
      rules: tenantRules.expireTime,
      description: '留空表示永不过期；若设置则必须是未来时间',
      hideDescriptionOnError: true
    },
    render: (_, tenant) => <ExpireTimeCell value={tenant.expireTime} />
  },
  {
    title: '管理员用户',
    dataIndex: 'adminUsername',
    order: 4,
    fieldProps: { maxLength: 64, placeholder: '请输入管理员用户', autoComplete: 'off' },
    formItemProps: { rules: tenantRules.adminUsername }
  },
  {
    title: '管理员密码',
    dataIndex: 'adminPassword',
    valueType: 'password',
    order: 3,
    hideInTable: true,
    hideInDescriptions: true,
    fieldProps: { maxLength: 32, placeholder: '请输入管理员密码', autoComplete: 'new-password' },
    formItemProps: { rules: tenantRules.adminPassword, description: PASSWORD_HINT, hideDescriptionOnError: true }
  },
  {
    title: '状态',
    dataIndex: 'status',
    valueType: 'switch',
    valueEnum: STATUS_ENUM,
    initialValue: 1,
    order: -1,
    formItemProps: form => ({
      rules: tenantRules.status,
      required: false,
      description: form.getFieldValue('status') === 1 ? '启用后该租户可以正常访问' : '禁用后该租户无法访问'
    })
  },
  {
    title: '描述',
    dataIndex: 'description',
    valueType: 'textarea',
    span: 2,
    order: 1,
    ellipsis: true,
    fieldProps: { maxLength: 200, rows: 3, placeholder: '请输入描述' },
    formItemProps: { rules: tenantRules.description },
    render: (dom, tenant, _index, _action, { type }) =>
      type === 'descriptions' ? (
        <span className="whitespace-pre-wrap">{tenant.description || EMPTY_PLACEHOLDER}</span>
      ) : (
        dom
      )
  },
  { title: '创建人', dataIndex: 'createUserString', hideInForm: true },
  { title: '创建时间', dataIndex: 'createTime', valueType: 'dateTime', hideInForm: true },
  { title: '修改人', dataIndex: 'updateUserString', hideInForm: true },
  { title: '修改时间', dataIndex: 'updateTime', valueType: 'dateTime', hideInForm: true }
] as const satisfies readonly ProColumns<TenantRecord>[]

export function getTenantFormColumns(isCreate: boolean): readonly ProColumns<TenantRecord>[] {
  return tenantColumns.map(column => {
    if (!('dataIndex' in column)) return column
    if (column.dataIndex === 'adminUsername' || column.dataIndex === 'adminPassword')
      return { ...column, hideInForm: !isCreate }
    if (!isCreate && column.dataIndex === 'packageId')
      return {
        ...column,
        ignoreFormItem: true,
        formItemProps: { rules: tenantRules.packageId },
        formItemRender: () => null
      }
    return column
  })
}

export function createTenantColumns(options: TenantColumnOptions): readonly ProColumns<TenantRecord>[] {
  const { canGet, canUpdate, canUpdateAdminPassword, canDelete } = options
  return canGet || canUpdate || canUpdateAdminPassword || canDelete
    ? [
        ...tenantColumns,
        {
          title: '操作',
          valueType: 'option',
          fixed: 'right',
          render: (_, tenant) => <RowActions {...options} tenant={tenant} />
        }
      ]
    : tenantColumns
}
