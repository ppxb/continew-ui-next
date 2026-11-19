import { z } from 'zod'
import { Eye, HelpCircle, PenLine, Trash2 } from 'lucide-react'

import { CopyButton } from '@/components/copy-button'
import { CopyableText } from '@/components/copyable-text'
import { FlagBadge, TagList, TypeBadge, type TypeTone } from '@/components/data-badge'
import { FilterSelect } from '@/components/filter-select'
import type { ProColumns } from '@/components/pro'
import { RowActionsMenu } from '@/components/row-actions-menu'
import { StatusCell } from '@/components/status-cell'
import { Badge } from '@/components/ui/badge'
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { usePermission } from '@/hooks/use-permission'
import type { ClientReq, ClientResp } from '@/lib/api/client'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'

import { type DictOption, toLabelMap } from '../use-dict-options'
import { ClientAuthTypeSelect } from './auth-type-select'

export const AUTH_TYPE_OPTIONS = [
  { label: '账号密码', value: 'ACCOUNT' },
  { label: '短信验证码', value: 'SMS' },
  { label: '邮箱验证码', value: 'EMAIL' },
  { label: '三方授权', value: 'SOCIAL' }
]

export const REFRESH_TOKEN_MODE_OPTIONS = [
  { label: 'Cookie（Web）', value: 'COOKIE' },
  { label: '响应体（App / 小程序）', value: 'BODY' }
]

export const REFRESH_TOKEN_MODE_MAP = toLabelMap(REFRESH_TOKEN_MODE_OPTIONS)

export const REPLACED_RANGE_PRESETS = [
  { label: '当前客户端类型', value: 'CURR_DEVICE_TYPE' },
  { label: '所有客户端类型', value: 'ALL_DEVICE_TYPE' }
]

export const LOGOUT_MODE_PRESETS = [
  { label: '注销下线', value: 'LOGOUT' },
  { label: '踢人下线', value: 'KICKOUT' },
  { label: '顶人下线', value: 'REPLACED' }
]

const CLIENT_TYPE_TONES: Record<string, TypeTone> = {
  PC: 'blue',
  APP: 'teal',
  MINI: 'amber',
  WEB: 'violet'
}

export type ClientAction = 'detail' | 'edit' | 'delete'

function ClientIdCell({ clientId }: { clientId: string }) {
  return (
    <div className="flex items-center gap-1.5 text-foreground">
      <span className="truncate">{clientId}</span>
      <CopyButton
        value={clientId}
        label="复制客户端 ID"
        successMessage="已复制客户端 ID"
        className="size-6 text-muted-foreground transition-colors hover:text-foreground"
      />
    </div>
  )
}

function RowActions({
  client,
  onAction
}: {
  client: ClientResp
  onAction: (action: ClientAction, client: ClientResp) => void
}) {
  const { hasPermission } = usePermission()
  const isLocked = Boolean(client.disabled)

  return (
    <div className="flex items-center justify-center">
      <RowActionsMenu>
        <DropdownMenuGroup>
          {hasPermission('system:client:get') && (
            <DropdownMenuItem onClick={() => onAction('detail', client)}>
              <Eye />
              客户端详情
            </DropdownMenuItem>
          )}
          {hasPermission('system:client:update') && (
            <DropdownMenuItem disabled={isLocked} onClick={() => onAction('edit', client)}>
              <PenLine />
              修改客户端
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        {hasPermission('system:client:delete') && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" disabled={isLocked} onClick={() => onAction('delete', client)}>
                <Trash2 />
                删除
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
      </RowActionsMenu>
    </div>
  )
}

export interface ClientColumnOptions {
  readonly clientTypeOptions: DictOption[]
  readonly authTypeOptions: DictOption[]
  readonly replacedRangeOptions: DictOption[]
  readonly logoutModeOptions: DictOption[]
  readonly onAction: (action: ClientAction, client: ClientResp) => void
}

const INTEGER_TEXT_PATTERN = /^-?\d+$/
const integerText = z.string().trim().regex(INTEGER_TEXT_PATTERN, '请输入有效整数')
const toInteger = (value: unknown) => {
  const text = String(value ?? '').trim()
  return INTEGER_TEXT_PATTERN.test(text) ? Number(text) : null
}

function LabelWithHint({ label, hint }: { label: string; hint: string }) {
  return (
    <>
      <span>{label}</span>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex cursor-help text-muted-foreground" />}>
          <HelpCircle className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent side="top">{hint}</TooltipContent>
      </Tooltip>
    </>
  )
}

export interface ClientSubmitValues {
  clientType: string
  authType: string[]
  activeTimeout: number
  timeout: number
  refreshTokenTimeout: number
  refreshTokenMode: string
  isConcurrent: boolean
  replacedRange?: string
  maxLoginCount: number
  overflowLogoutMode?: string
  status: 1 | 2
}

/** The active form schema has already parsed the numeric text fields. */
export function toClientPayload(value: ClientSubmitValues): ClientReq {
  return {
    clientType: value.clientType,
    authType: value.authType,
    activeTimeout: value.activeTimeout,
    timeout: value.timeout,
    refreshTokenTimeout: value.refreshTokenTimeout,
    refreshTokenMode: value.refreshTokenMode,
    isConcurrent: value.isConcurrent,
    replacedRange: value.isConcurrent ? undefined : value.replacedRange,
    maxLoginCount: value.isConcurrent ? value.maxLoginCount : -1,
    overflowLogoutMode: value.isConcurrent && value.maxLoginCount !== -1 ? value.overflowLogoutMode : undefined,
    status: value.status
  }
}

/** One column configuration supplies table, search, form and details. */
export function createClientColumns(options: ClientColumnOptions): readonly ProColumns<ClientResp>[] {
  const { clientTypeOptions, authTypeOptions, replacedRangeOptions, logoutModeOptions, onAction } = options
  const clientTypeMap = toLabelMap(clientTypeOptions)
  const authTypeMap = toLabelMap(authTypeOptions)
  const replacedRangeMap = toLabelMap(replacedRangeOptions)
  const logoutModeMap = toLabelMap(logoutModeOptions)
  return [
    { title: '序号', valueType: 'index' },
    { title: 'ID', dataIndex: 'id', hideInTable: true, hideInForm: true },
    {
      title: '客户端 ID',
      dataIndex: 'clientId',
      hideInForm: true,
      hideInSetting: true,
      span: 2,
      render: (_, client, _index, _action, { type }) =>
        type === 'table' ? (
          <ClientIdCell clientId={client.clientId} />
        ) : (
          <CopyableText
            value={client.clientId}
            label="复制客户端 ID"
            successMessage="已复制客户端 ID"
            className="break-all"
          />
        )
    },
    {
      title: '客户端类型',
      dataIndex: 'clientType',
      valueType: 'select',
      search: true,
      initialValue: 'PC',
      span: 2,
      valueEnum: clientTypeMap,
      fieldProps: { placeholder: '请选择客户端类型' },
      formItemProps: { rules: z.string().min(1, '请选择客户端类型') },
      formItemRender: (_schema, control) =>
        control.type === 'table' ? (
          <FilterSelect
            label="客户端类型"
            options={[{ value: 'all', label: '全部' }, ...clientTypeOptions]}
            value={typeof control.value === 'string' ? control.value : 'all'}
            onValueChange={value => control.onChange(!value || value === 'all' ? undefined : value)}
            className="w-full sm:w-40"
          />
        ) : (
          control.defaultRender()
        ),
      render: (_, client, _index, _action, { type }) =>
        type === 'table' ? (
          <TypeBadge
            tone={CLIENT_TYPE_TONES[client.clientType] ?? 'neutral'}
            label={clientTypeMap[client.clientType] || client.clientType}
          />
        ) : (
          <Badge variant="outline">{clientTypeMap[client.clientType] || client.clientType}</Badge>
        )
    },
    {
      title: '认证类型',
      dataIndex: 'authType',
      valueType: 'select',
      valueEnum: authTypeMap,
      initialValue: ['ACCOUNT'],
      span: 2,
      convertValue: value => value ?? ['ACCOUNT'],
      formItemProps: { rules: z.array(z.string()).min(1, '请至少选择一种认证类型') },
      formItemRender: (_schema, control) => (
        <ClientAuthTypeSelect
          id={control.id}
          onBlur={control.onBlur}
          value={control.value as string[]}
          onChange={control.onChange}
          options={authTypeOptions}
          invalid={control.invalid}
          disabled={control.disabled}
        />
      ),
      render: (_, client, _index, _action, { type }) =>
        type === 'table' ? (
          <TagList items={(client.authType ?? []).map(authType => authTypeMap[authType] || authType)} max={1} />
        ) : (
          <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap">
            {client.authType?.map(authType => (
              <Badge key={authType} variant="secondary" className="shrink-0 font-normal whitespace-nowrap">
                {authTypeMap[authType] || authType}
              </Badge>
            ))}
          </div>
        )
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'switch',
      initialValue: 1,
      order: -1,
      span: 2,
      search: true,
      valueEnum: new Map([
        [1, '启用'],
        [2, '禁用']
      ]),
      formItemProps: {
        rules: z.literal([1, 2]),
        required: false,
        description: '启用或禁用该客户端通道',
        className: 'sm:col-span-2'
      },
      formItemRender: (_schema, control) =>
        control.type === 'table' ? (
          <FilterSelect
            label="状态"
            options={[
              { value: 'all', label: '全部' },
              { value: '1', label: '启用' },
              { value: '2', label: '禁用' }
            ]}
            value={control.value === undefined ? 'all' : String(control.value)}
            onValueChange={value => control.onChange(!value || value === 'all' ? undefined : Number(value))}
            className="w-full sm:w-32"
          />
        ) : (
          control.defaultRender()
        ),
      render: (_, client) => <StatusCell status={client.status} />
    },
    {
      title: (_, type) =>
        type === 'form' ? (
          <LabelWithHint label="Token 最低活跃频率" hint="-1：不限制，永不冻结" />
        ) : (
          'Token 最低活跃频率'
        ),
      dataIndex: 'activeTimeout',
      initialValue: '1800',
      convertValue: value => String(value ?? 1800),
      fieldProps: { inputMode: 'numeric', addonEnd: '秒' },
      formItemProps: { rules: integerText.transform(Number) },
      render: (_, client) => <span>{client.activeTimeout === -1 ? '不限制' : `${client.activeTimeout} 秒`}</span>
    },
    {
      title: (_, type) =>
        type === 'form' ? <LabelWithHint label="Token 有效期" hint="-1：永不过期" /> : 'Token 有效期',
      dataIndex: 'timeout',
      initialValue: '86400',
      convertValue: value => String(value ?? 86400),
      fieldProps: { inputMode: 'numeric', addonEnd: '秒' },
      formItemProps: { rules: integerText.transform(Number) },
      render: (_, client) => <span>{client.timeout === -1 ? '永不过期' : `${client.timeout} 秒`}</span>
    },
    {
      title: (_, type) =>
        type === 'form' ? (
          <LabelWithHint label="Refresh Token 有效期" hint="轮换不会延长该绝对有效期；单位：秒" />
        ) : (
          'Refresh Token 有效期'
        ),
      dataIndex: 'refreshTokenTimeout',
      initialValue: '2592000',
      convertValue: value => String(value ?? 2592000),
      fieldProps: { inputMode: 'numeric', addonEnd: '秒' },
      formItemProps: {
        rules: integerText
          .refine(value => Number(value) >= 60, 'Refresh Token 有效期不能少于 60 秒')
          .refine(value => Number(value) <= 315360000, 'Refresh Token 有效期不能超过 10 年')
          .transform(Number)
      },
      render: (_, client) => (
        <span>{client.refreshTokenTimeout ? `${client.refreshTokenTimeout} 秒` : EMPTY_PLACEHOLDER}</span>
      )
    },
    {
      title: 'Refresh Token 传输模式',
      dataIndex: 'refreshTokenMode',
      valueType: 'select',
      valueEnum: REFRESH_TOKEN_MODE_MAP,
      initialValue: 'COOKIE',
      fieldProps: { placeholder: '请选择 Refresh Token 传输模式' },
      formItemProps: { rules: z.string().min(1, '请选择 Refresh Token 传输模式') }
    },
    {
      title: (_, type) => (type === 'form' ? '是否允许同一账号多地同时登录' : '多地登录'),
      dataIndex: 'isConcurrent',
      valueType: 'switch',
      initialValue: true,
      formItemProps: {
        rules: z.boolean(),
        required: false,
        description: '新登录是否允许与旧登录共存',
        className: 'sm:col-span-2'
      },
      fieldProps: form => ({
        checkedValue: true,
        uncheckedValue: false,
        onChange: value => {
          if (value) form?.setFieldsValue({ replacedRange: undefined })
          else form?.setFieldsValue({ maxLoginCount: '-1', overflowLogoutMode: undefined })
        }
      }),
      render: (_, client, _index, _action, { type }) =>
        type === 'table' ? (
          <FlagBadge active={client.isConcurrent} activeLabel="允许" inactiveLabel="互斥" />
        ) : (
          <Badge variant={client.isConcurrent ? 'default' : 'secondary'} className="font-normal">
            {client.isConcurrent ? '允许' : '互斥'}
          </Badge>
        )
    },
    {
      valueType: 'dependency',
      name: ['isConcurrent', 'maxLoginCount'],
      columns: () => [
        {
          title: (_, type) => (type === 'form' ? '顶人下线的范围' : '下线范围'),
          dataIndex: 'replacedRange',
          valueType: 'select',
          valueEnum: replacedRangeMap,
          convertValue: (value, _field, entity) => (entity.isConcurrent !== false ? undefined : value || undefined),
          fieldProps: form => ({
            disabled: form?.getFieldValue('isConcurrent') !== false,
            placeholder: form?.getFieldValue('isConcurrent') !== false ? '允许并发登录时不适用' : '请选择顶人下线的范围'
          }),
          formItemProps: form => ({
            required: form.getFieldValue('isConcurrent') === false,
            rules: z
              .string()
              .optional()
              .refine(
                value => form.getFieldValue('isConcurrent') !== false || !!value,
                '不允许并发登录时必须选择顶人下线的范围'
              )
          })
        },
        {
          title: (_, type) =>
            type === 'form' ? <LabelWithHint label="同一账号最大登录数量" hint="-1：不限制" /> : '登录数量',
          dataIndex: 'maxLoginCount',
          initialValue: '-1',
          convertValue: (value, _field, entity) => (entity.isConcurrent === false ? '-1' : String(value ?? -1)),
          fieldProps: form => ({
            inputMode: 'numeric',
            addonEnd: '个',
            disabled: form?.getFieldValue('isConcurrent') === false,
            onChange: value => {
              if (Number(value) === -1 || Number(value) === 0) form?.setFieldsValue({ overflowLogoutMode: undefined })
            }
          }),
          formItemProps: form => ({
            required: false,
            rules: integerText
              .refine(
                value => form.getFieldValue('isConcurrent') === false || Number(value) === -1 || Number(value) > 0,
                '最大登录数量只能为 -1 或正整数'
              )
              .transform(Number)
          }),
          render: (_, client) => (
            <span>
              {client.maxLoginCount === -1
                ? '不限制'
                : client.maxLoginCount != null
                  ? `${client.maxLoginCount} 个`
                  : EMPTY_PLACEHOLDER}
            </span>
          )
        },
        {
          title: (_, type) => (type === 'form' ? '溢出人数的下线方式' : '溢出处理'),
          dataIndex: 'overflowLogoutMode',
          valueType: 'select',
          valueEnum: logoutModeMap,
          convertValue: (value, _field, entity) =>
            entity.isConcurrent === false || [-1, 0].includes(entity.maxLoginCount ?? -1)
              ? undefined
              : value || undefined,
          fieldProps: form => {
            const disabled =
              form?.getFieldValue('isConcurrent') === false ||
              [-1, 0].includes(Number(form?.getFieldValue('maxLoginCount')))
            return { disabled, placeholder: disabled ? '最大登录数量未限制时不适用' : '请选择溢出人数的下线方式' }
          },
          formItemProps: form => {
            const count = toInteger(form.getFieldValue('maxLoginCount'))
            const required =
              form.getFieldValue('isConcurrent') !== false &&
              ![-1, 0].includes(Number(form.getFieldValue('maxLoginCount')))
            return {
              required,
              className: 'sm:col-span-2',
              rules: z
                .string()
                .optional()
                .refine(
                  value => form.getFieldValue('isConcurrent') === false || count === null || count === -1 || !!value,
                  '设置最大登录数量时必须选择溢出人数的下线方式'
                )
            }
          }
        }
      ]
    },
    { title: '创建人', dataIndex: 'createUserString', hideInForm: true },
    { title: '创建时间', dataIndex: 'createTime', valueType: 'dateTime', hideInForm: true },
    { title: '修改人', dataIndex: 'updateUserString', hideInForm: true },
    { title: '修改时间', dataIndex: 'updateTime', valueType: 'dateTime', hideInForm: true },
    { title: '操作', valueType: 'option', render: (_, client) => <RowActions client={client} onAction={onAction} /> }
  ]
}
