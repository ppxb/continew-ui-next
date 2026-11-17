import * as React from 'react'

import { revalidateLogic, useSelector } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { HelpCircle, Smartphone } from 'lucide-react'

import { EntityDrawer } from '@/components/entity-drawer'
import { useAppForm } from '@/components/form'
import { QueryState } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { DrawerFooter } from '@/components/ui/drawer'
import { FieldGroup } from '@/components/ui/field'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useFillFormOnce } from '@/hooks/use-fill-form-once'
import { createClient, getClient, updateClient, type ClientReq } from '@/lib/api/client'
import { clientKeys } from '@/lib/query-keys'

import { ClientAuthTypeSelect } from './auth-type-select'
import { AUTH_TYPE_OPTIONS, LOGOUT_MODE_PRESETS, REFRESH_TOKEN_MODE_OPTIONS, REPLACED_RANGE_PRESETS } from './columns'

const INTEGER_TEXT_PATTERN = /^-?\d+$/

/**
 * These four numbers are edited as text so that emptying a box leaves it empty. Storing a number
 * made `valueAsNumber` return `NaN`, which the previous code replaced with `-1` — a real business
 * value ("unlimited" / "never expires"), so clearing a field silently changed what would be saved.
 */
const integerText = z.string().trim().regex(INTEGER_TEXT_PATTERN, '请输入有效整数')

/** `null` when the text is not an integer yet; `-1` stays a real, valid value. */
const toNumber = (text: string) => (INTEGER_TEXT_PATTERN.test(text.trim()) ? Number(text) : null)

const clientFormSchema = z
  .object({
    clientType: z.string().min(1, '请选择客户端类型'),
    authType: z.array(z.string()).min(1, '请至少选择一种认证类型'),
    activeTimeout: integerText,
    timeout: integerText,
    refreshTokenTimeout: integerText
      .refine(value => Number(value) >= 60, 'Refresh Token 有效期不能少于 60 秒')
      .refine(value => Number(value) <= 315360000, 'Refresh Token 有效期不能超过 10 年'),
    refreshTokenMode: z.string().min(1, '请选择 Refresh Token 传输模式'),
    isConcurrent: z.boolean(),
    replacedRange: z.string().optional(),
    maxLoginCount: integerText,
    overflowLogoutMode: z.string().optional(),
    status: z.number().int().min(1).max(2)
  })
  .superRefine((data, ctx) => {
    const maxLoginCount = toNumber(data.maxLoginCount)

    if (!data.isConcurrent && !data.replacedRange) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['replacedRange'],
        message: '不允许并发登录时必须选择顶人下线的范围'
      })
    }
    if (data.isConcurrent && maxLoginCount !== null && maxLoginCount !== -1 && !data.overflowLogoutMode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['overflowLogoutMode'],
        message: '设置最大登录数量时必须选择溢出人数的下线方式'
      })
    }
    if (data.isConcurrent && maxLoginCount !== null && maxLoginCount <= 0 && maxLoginCount !== -1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxLoginCount'],
        message: '最大登录数量只能为 -1 或正整数'
      })
    }
  })

type ClientFormValues = z.infer<typeof clientFormSchema>

const DEFAULT_FORM_VALUES: ClientFormValues = {
  clientType: 'PC',
  authType: ['ACCOUNT'],
  activeTimeout: '1800',
  timeout: '86400',
  refreshTokenTimeout: '2592000',
  refreshTokenMode: 'COOKIE',
  isConcurrent: true,
  replacedRange: undefined,
  maxLoginCount: '-1',
  overflowLogoutMode: undefined,
  status: 1
}

/** A field label followed by a help icon that shows `hint` on hover. */
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

function ClientFormSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
        </div>
      </div>

      <DrawerFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button disabled>保存</Button>
      </DrawerFooter>
    </div>
  )
}

interface ClientFormDrawerProps {
  readonly clientId: string | number | null
  readonly open: boolean
  readonly clientTypeOptions: { label: string; value: string }[]
  readonly authTypeOptions?: { label: string; value: string }[]
  readonly replacedRangeOptions?: { label: string; value: string }[]
  readonly logoutModeOptions?: { label: string; value: string }[]
  readonly onClose: () => void
}

export function ClientFormDrawer({
  clientId,
  open,
  clientTypeOptions,
  authTypeOptions = AUTH_TYPE_OPTIONS,
  replacedRangeOptions = REPLACED_RANGE_PRESETS,
  logoutModeOptions = LOGOUT_MODE_PRESETS,
  onClose
}: ClientFormDrawerProps) {
  const queryClient = useQueryClient()
  const isEdit = Boolean(clientId)

  const form = useAppForm({
    defaultValues: DEFAULT_FORM_VALUES,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: clientFormSchema },
    onSubmit: async ({ value }) => {
      const payload: ClientReq = {
        clientType: value.clientType,
        authType: value.authType,
        activeTimeout: Number(value.activeTimeout),
        timeout: Number(value.timeout),
        refreshTokenTimeout: Number(value.refreshTokenTimeout),
        refreshTokenMode: value.refreshTokenMode,
        isConcurrent: value.isConcurrent,
        replacedRange: value.isConcurrent ? undefined : value.replacedRange,
        maxLoginCount: value.isConcurrent ? Number(value.maxLoginCount) : -1,
        overflowLogoutMode:
          value.isConcurrent && Number(value.maxLoginCount) !== -1 ? value.overflowLogoutMode : undefined,
        status: value.status as 1 | 2
      }

      try {
        if (clientId === null) {
          await createClient(payload)
        } else {
          await updateClient(clientId, payload)
        }
      } catch {
        // The HTTP layer already reported the failure.
        return
      }

      toast.add({ title: isEdit ? '修改客户端成功' : '新增客户端成功', type: 'success' })
      void queryClient.invalidateQueries({ queryKey: clientKeys.all })
      onClose()
    }
  })

  // `form.state` is a render-time snapshot, so the values that gate each field and the "saving" flag
  // that disables them all come from subscriptions.
  const isConcurrent = useSelector(form.store, state => state.values.isConcurrent)
  const maxLoginCount = useSelector(form.store, state => state.values.maxLoginCount)
  const isSubmitting = useSelector(form.store, state => state.isSubmitting)

  // Fetch client details when editing
  const {
    data: clientDetail,
    dataUpdatedAt: clientDetailUpdatedAt,
    isLoading,
    isError: isDetailError,
    refetch: refetchDetail
  } = useQuery({
    queryKey: clientKeys.detail(clientId ?? ''),
    queryFn: ({ signal }) => getClient(clientId!, signal),
    enabled: open && isEdit
  })

  useFillFormOnce({
    open,
    isEdit,
    entityKey: clientId,
    record: clientDetail,
    version: clientDetailUpdatedAt,
    buildValues: ({ isEdit: editing, record }) =>
      editing && record
        ? {
            clientType: record.clientType,
            authType: record.authType || ['ACCOUNT'],
            activeTimeout: String(record.activeTimeout ?? 1800),
            timeout: String(record.timeout ?? 86400),
            refreshTokenTimeout: String(record.refreshTokenTimeout ?? 2592000),
            refreshTokenMode: record.refreshTokenMode ?? 'COOKIE',
            isConcurrent: record.isConcurrent ?? true,
            replacedRange: record.replacedRange || undefined,
            maxLoginCount: String(record.maxLoginCount ?? -1),
            overflowLogoutMode: record.overflowLogoutMode || undefined,
            status: record.status ?? 1
          }
        : { ...DEFAULT_FORM_VALUES },
    apply: values => form.reset(values, { keepDefaultValues: true })
  })

  // Keep the fields that no longer apply out of the payload and out of the error list.
  React.useEffect(() => {
    if (isConcurrent) {
      form.setFieldValue('replacedRange', undefined)
      return
    }

    form.setFieldValue('maxLoginCount', '-1')
    form.setFieldValue('overflowLogoutMode', undefined)
  }, [isConcurrent, form])

  React.useEffect(() => {
    const count = Number(maxLoginCount)

    if (count === -1 || count === 0) {
      form.setFieldValue('overflowLogoutMode', undefined)
    }
  }, [maxLoginCount, form])

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? '修改客户端' : '新增客户端'}
      icon={<Smartphone className="size-4" />}
      width={36}
      closeDisabled={isSubmitting}
      canClose={() => !isSubmitting}
    >
      {isEdit && isLoading ? (
        <ClientFormSkeleton onClose={onClose} />
      ) : isDetailError ? (
        // Without the record the form would post its defaults over an existing client.
        <QueryState state="error" className="p-6" onRetry={() => void refetchDetail()} />
      ) : (
        <form.AppForm>
          <form.FormShell footer={<form.FormFooter onCancel={onClose} />}>
            <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* 客户端类型 */}
              <form.AppField name="clientType" validators={{ onDynamic: clientFormSchema.shape.clientType }}>
                {field => (
                  <field.SelectInput
                    label="客户端类型"
                    required
                    options={clientTypeOptions}
                    placeholder="请选择客户端类型"
                    disabled={isSubmitting}
                  />
                )}
              </form.AppField>

              {/* 认证类型 - Select 多选 */}
              <form.AppField name="authType" validators={{ onDynamic: clientFormSchema.shape.authType }}>
                {field => (
                  <field.CustomField label="认证类型" required>
                    {({ invalid }) => (
                      <ClientAuthTypeSelect
                        value={field.state.value}
                        onChange={field.handleChange}
                        options={authTypeOptions}
                        disabled={isSubmitting}
                        invalid={invalid}
                      />
                    )}
                  </field.CustomField>
                )}
              </form.AppField>

              {/* Token 最低活跃频率 */}
              <form.AppField name="activeTimeout" validators={{ onDynamic: clientFormSchema.shape.activeTimeout }}>
                {field => (
                  <field.TextInput
                    label={<LabelWithHint label="Token 最低活跃频率" hint="-1：不限制，永不冻结" />}
                    required
                    inputMode="numeric"
                    addonEnd="秒"
                    disabled={isSubmitting}
                  />
                )}
              </form.AppField>

              {/* Token 有效期 */}
              <form.AppField name="timeout" validators={{ onDynamic: clientFormSchema.shape.timeout }}>
                {field => (
                  <field.TextInput
                    label={<LabelWithHint label="Token 有效期" hint="-1：永不过期" />}
                    required
                    inputMode="numeric"
                    addonEnd="秒"
                    disabled={isSubmitting}
                  />
                )}
              </form.AppField>

              {/* Refresh Token 有效期 */}
              <form.AppField
                name="refreshTokenTimeout"
                validators={{ onDynamic: clientFormSchema.shape.refreshTokenTimeout }}
              >
                {field => (
                  <field.TextInput
                    label={<LabelWithHint label="Refresh Token 有效期" hint="轮换不会延长该绝对有效期；单位：秒" />}
                    required
                    inputMode="numeric"
                    addonEnd="秒"
                    disabled={isSubmitting}
                  />
                )}
              </form.AppField>

              {/* Refresh Token 传输模式 */}
              <form.AppField
                name="refreshTokenMode"
                validators={{ onDynamic: clientFormSchema.shape.refreshTokenMode }}
              >
                {field => (
                  <field.SelectInput
                    label="Refresh Token 传输模式"
                    required
                    options={REFRESH_TOKEN_MODE_OPTIONS}
                    placeholder="请选择 Refresh Token 传输模式"
                    disabled={isSubmitting}
                  />
                )}
              </form.AppField>

              {/* 是否允许同一账号多地同时登录 */}
              <form.AppField name="isConcurrent">
                {field => (
                  <field.SwitchInput
                    label="是否允许同一账号多地同时登录"
                    description="新登录是否允许与旧登录共存"
                    checkedValue={true}
                    uncheckedValue={false}
                    disabled={isSubmitting}
                    className="sm:col-span-2"
                  />
                )}
              </form.AppField>

              {/* 顶人下线的范围（isConcurrent=false 时生效且必选） */}
              <form.AppField name="replacedRange" validators={{ onDynamic: clientFormSchema.shape.replacedRange }}>
                {field => (
                  <field.CustomField label="顶人下线的范围" required={!isConcurrent}>
                    {({ id, invalid }) => (
                      <Select
                        items={replacedRangeOptions}
                        value={field.state.value || ''}
                        disabled={isConcurrent || isSubmitting}
                        onValueChange={val => field.handleChange(val || undefined)}
                      >
                        <SelectTrigger id={id} className="w-full" aria-invalid={invalid}>
                          <SelectValue placeholder={isConcurrent ? '允许并发登录时不适用' : '请选择顶人下线的范围'} />
                        </SelectTrigger>
                        <SelectContent align="start" alignItemWithTrigger={false}>
                          <SelectGroup>
                            {replacedRangeOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  </field.CustomField>
                )}
              </form.AppField>

              {/* 同一账号最大登录数量（isConcurrent=true 时有效） */}
              <form.AppField name="maxLoginCount" validators={{ onDynamic: clientFormSchema.shape.maxLoginCount }}>
                {field => (
                  <field.TextInput
                    label={<LabelWithHint label="同一账号最大登录数量" hint="-1：不限制" />}
                    inputMode="numeric"
                    addonEnd="个"
                    disabled={!isConcurrent || isSubmitting}
                  />
                )}
              </form.AppField>

              {/* 溢出人数的下线方式 */}
              <form.AppField
                name="overflowLogoutMode"
                validators={{ onDynamic: clientFormSchema.shape.overflowLogoutMode }}
              >
                {field => {
                  const count = Number(maxLoginCount)
                  const disabled = !isConcurrent || count === -1 || count === 0

                  return (
                    <field.CustomField label="溢出人数的下线方式" required={!disabled} className="sm:col-span-2">
                      {({ id, invalid }) => (
                        <Select
                          items={logoutModeOptions}
                          value={field.state.value || ''}
                          disabled={disabled || isSubmitting}
                          onValueChange={val => field.handleChange(val || undefined)}
                        >
                          <SelectTrigger id={id} className="w-full" aria-invalid={invalid}>
                            <SelectValue
                              placeholder={disabled ? '最大登录数量未限制时不适用' : '请选择溢出人数的下线方式'}
                            />
                          </SelectTrigger>
                          <SelectContent align="start" alignItemWithTrigger={false}>
                            <SelectGroup>
                              {logoutModeOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                    </field.CustomField>
                  )
                }}
              </form.AppField>

              {/* 状态 */}
              <form.AppField name="status">
                {field => (
                  <field.SwitchInput
                    label="状态"
                    description="启用或禁用该客户端通道"
                    disabled={isSubmitting}
                    className="sm:col-span-2"
                  />
                )}
              </form.AppField>
            </FieldGroup>
          </form.FormShell>
        </form.AppForm>
      )}
    </EntityDrawer>
  )
}
