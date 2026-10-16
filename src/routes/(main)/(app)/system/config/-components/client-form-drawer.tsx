import * as React from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HelpCircle, Smartphone, X } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { createClient, getClient, updateClient, type ClientReq } from '@/lib/api/client'
import { clientKeys } from '@/lib/query-keys'

import { ClientAuthTypeSelect } from './client-auth-type-select'
import {
  AUTH_TYPE_OPTIONS,
  LOGOUT_MODE_PRESETS,
  REFRESH_TOKEN_MODE_OPTIONS,
  REPLACED_RANGE_PRESETS
} from './client-columns'

const clientFormSchema = z
  .object({
    clientType: z.string().min(1, '请选择客户端类型'),
    authType: z.array(z.string()).min(1, '请至少选择一种认证类型'),
    activeTimeout: z.number().int({ message: '请输入有效整数' }),
    timeout: z.number().int({ message: '请输入有效整数' }),
    refreshTokenTimeout: z
      .number()
      .int({ message: '请输入有效整数' })
      .min(60, 'Refresh Token 有效期不能少于 60 秒')
      .max(315360000, 'Refresh Token 有效期不能超过 10 年'),
    refreshTokenMode: z.string().min(1, '请选择 Refresh Token 传输模式'),
    isConcurrent: z.boolean(),
    replacedRange: z.string().optional(),
    maxLoginCount: z.number().int({ message: '请输入有效整数' }),
    overflowLogoutMode: z.string().optional(),
    status: z.number().int().min(1).max(2)
  })
  .superRefine((data, ctx) => {
    if (!data.isConcurrent && !data.replacedRange) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['replacedRange'],
        message: '不允许并发登录时必须选择顶人下线的范围'
      })
    }
    if (data.isConcurrent && data.maxLoginCount !== -1 && !data.overflowLogoutMode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['overflowLogoutMode'],
        message: '设置最大登录数量时必须选择溢出人数的下线方式'
      })
    }
    if (data.isConcurrent && data.maxLoginCount <= 0 && data.maxLoginCount !== -1) {
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
  activeTimeout: 1800,
  timeout: 86400,
  refreshTokenTimeout: 2592000,
  refreshTokenMode: 'COOKIE',
  isConcurrent: true,
  replacedRange: undefined,
  maxLoginCount: -1,
  overflowLogoutMode: undefined,
  status: 1
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

      <DrawerFooter className="flex-row justify-end gap-2 border-t p-4">
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

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: DEFAULT_FORM_VALUES
  })

  const isConcurrent = useWatch({ control: form.control, name: 'isConcurrent', defaultValue: true })
  const maxLoginCount = useWatch({ control: form.control, name: 'maxLoginCount', defaultValue: -1 })

  // Fetch client details when editing
  const { data: clientDetail, isLoading } = useQuery({
    queryKey: clientKeys.detail(clientId ?? ''),
    queryFn: () => getClient(clientId!),
    enabled: open && isEdit
  })

  // Synchronize form values on open/fetch
  React.useEffect(() => {
    if (!open) {
      form.reset(DEFAULT_FORM_VALUES)
      return
    }

    if (isEdit && clientDetail) {
      form.reset({
        clientType: clientDetail.clientType,
        authType: clientDetail.authType || ['ACCOUNT'],
        activeTimeout: clientDetail.activeTimeout ?? 1800,
        timeout: clientDetail.timeout ?? 86400,
        refreshTokenTimeout: clientDetail.refreshTokenTimeout ?? 2592000,
        refreshTokenMode: clientDetail.refreshTokenMode ?? 'COOKIE',
        isConcurrent: clientDetail.isConcurrent ?? true,
        replacedRange: clientDetail.replacedRange || undefined,
        maxLoginCount: clientDetail.maxLoginCount ?? -1,
        overflowLogoutMode: clientDetail.overflowLogoutMode || undefined,
        status: clientDetail.status ?? 1
      })
    } else if (!isEdit) {
      form.reset(DEFAULT_FORM_VALUES)
    }
  }, [open, isEdit, clientDetail, form])

  // Handle field inter-dependencies
  React.useEffect(() => {
    if (isConcurrent) {
      form.setValue('replacedRange', undefined)
      form.clearErrors('replacedRange')
    } else {
      form.setValue('maxLoginCount', -1)
      form.setValue('overflowLogoutMode', undefined)
      form.clearErrors(['maxLoginCount', 'overflowLogoutMode'])
    }
  }, [isConcurrent, form])

  React.useEffect(() => {
    if (maxLoginCount === -1 || maxLoginCount === 0) {
      form.setValue('overflowLogoutMode', undefined)
      form.clearErrors('overflowLogoutMode')
    }
  }, [maxLoginCount, form])

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (values: ClientFormValues) => {
      const payload: ClientReq = {
        clientType: values.clientType,
        authType: values.authType,
        activeTimeout: values.activeTimeout,
        timeout: values.timeout,
        refreshTokenTimeout: values.refreshTokenTimeout,
        refreshTokenMode: values.refreshTokenMode,
        isConcurrent: values.isConcurrent,
        replacedRange: values.isConcurrent ? undefined : values.replacedRange,
        maxLoginCount: values.isConcurrent ? values.maxLoginCount : -1,
        overflowLogoutMode: values.isConcurrent && values.maxLoginCount !== -1 ? values.overflowLogoutMode : undefined,
        status: values.status as 1 | 2
      }

      if (isEdit && clientId) {
        await updateClient(clientId, payload)
      } else {
        await createClient(payload)
      }
    },
    onSuccess: () => {
      toast.add({ title: isEdit ? '修改客户端成功' : '新增客户端成功', type: 'success' })
      queryClient.invalidateQueries({ queryKey: clientKeys.all })
      onClose()
    },
    onError: (err: Error) => {
      toast.add({ title: err.message || (isEdit ? '修改失败' : '新增失败'), type: 'error' })
    }
  })

  const onSubmit = (values: ClientFormValues) => {
    saveMutation.mutate(values)
  }

  return (
    <Drawer
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen && !form.formState.isSubmitting) {
          onClose()
        }
      }}
      swipeDirection="right"
    >
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:36rem]">
        <DrawerHeader className="flex-row items-center justify-between gap-2 border-b p-4 md:gap-2">
          <div className="flex items-center gap-2">
            <Smartphone className="size-4" />
            <DrawerTitle>{isEdit ? '修改客户端' : '新增客户端'}</DrawerTitle>
          </div>
          <DrawerClose render={<Button variant="ghost" size="icon-sm" disabled={form.formState.isSubmitting} />}>
            <X className="size-4" />
            <span className="sr-only">关闭</span>
          </DrawerClose>
        </DrawerHeader>

        {isEdit && isLoading ? (
          <ClientFormSkeleton onClose={onClose} />
        ) : (
          <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* 客户端类型 */}
                <Controller
                  control={form.control}
                  name="clientType"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel>
                        客户端类型<span className="text-destructive">*</span>
                      </FieldLabel>
                      <Select
                        items={clientTypeOptions}
                        value={field.value}
                        onValueChange={val => {
                          if (!val) return
                          field.onChange(val)
                        }}
                      >
                        <SelectTrigger className="w-full" aria-invalid={fieldState.invalid}>
                          <SelectValue placeholder="请选择客户端类型" />
                        </SelectTrigger>
                        <SelectContent align="start" alignItemWithTrigger={false}>
                          <SelectGroup>
                            {clientTypeOptions.map(c => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                {/* 认证类型 - Select 多选 */}
                <Controller
                  control={form.control}
                  name="authType"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel>
                        认证类型<span className="text-destructive">*</span>
                      </FieldLabel>
                      <ClientAuthTypeSelect
                        value={field.value}
                        onChange={field.onChange}
                        options={authTypeOptions}
                        invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                {/* Token 最低活跃频率 */}
                <Controller
                  control={form.control}
                  name="activeTimeout"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel className="flex items-center gap-1">
                        <span>Token 最低活跃频率</span>
                        <span className="text-destructive">*</span>
                        <Tooltip>
                          <TooltipTrigger render={<span className="inline-flex cursor-help text-muted-foreground" />}>
                            <HelpCircle className="size-3.5" />
                          </TooltipTrigger>
                          <TooltipContent side="top">-1：不限制，永不冻结</TooltipContent>
                        </Tooltip>
                      </FieldLabel>
                      <div className="relative">
                        <Input
                          type="number"
                          value={field.value}
                          onChange={e =>
                            field.onChange(Number.isNaN(e.target.valueAsNumber) ? -1 : e.target.valueAsNumber)
                          }
                          className="pr-10"
                          aria-invalid={fieldState.invalid}
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                          秒
                        </span>
                      </div>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                {/* Token 有效期 */}
                <Controller
                  control={form.control}
                  name="timeout"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel className="flex items-center gap-1">
                        <span>Token 有效期</span>
                        <span className="text-destructive">*</span>
                        <Tooltip>
                          <TooltipTrigger render={<span className="inline-flex cursor-help text-muted-foreground" />}>
                            <HelpCircle className="size-3.5" />
                          </TooltipTrigger>
                          <TooltipContent side="top">-1：永不过期</TooltipContent>
                        </Tooltip>
                      </FieldLabel>
                      <div className="relative">
                        <Input
                          type="number"
                          value={field.value}
                          onChange={e =>
                            field.onChange(Number.isNaN(e.target.valueAsNumber) ? -1 : e.target.valueAsNumber)
                          }
                          className="pr-10"
                          aria-invalid={fieldState.invalid}
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                          秒
                        </span>
                      </div>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                {/* Refresh Token 有效期 */}
                <Controller
                  control={form.control}
                  name="refreshTokenTimeout"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel className="flex items-center gap-1">
                        <span>Refresh Token 有效期</span>
                        <span className="text-destructive">*</span>
                        <Tooltip>
                          <TooltipTrigger render={<span className="inline-flex cursor-help text-muted-foreground" />}>
                            <HelpCircle className="size-3.5" />
                          </TooltipTrigger>
                          <TooltipContent side="top">轮换不会延长该绝对有效期；单位：秒</TooltipContent>
                        </Tooltip>
                      </FieldLabel>
                      <div className="relative">
                        <Input
                          type="number"
                          value={field.value ?? 2592000}
                          onChange={e =>
                            field.onChange(Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)
                          }
                          className="pr-10"
                          aria-invalid={fieldState.invalid}
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                          秒
                        </span>
                      </div>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                {/* Refresh Token 传输模式 */}
                <Controller
                  control={form.control}
                  name="refreshTokenMode"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel>
                        Refresh Token 传输模式<span className="text-destructive">*</span>
                      </FieldLabel>
                      <Select
                        items={REFRESH_TOKEN_MODE_OPTIONS}
                        value={field.value}
                        onValueChange={val => {
                          if (!val) return
                          field.onChange(val)
                        }}
                      >
                        <SelectTrigger className="w-full" aria-invalid={fieldState.invalid}>
                          <SelectValue placeholder="请选择 Refresh Token 传输模式" />
                        </SelectTrigger>
                        <SelectContent align="start" alignItemWithTrigger={false}>
                          <SelectGroup>
                            {REFRESH_TOKEN_MODE_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                {/* 是否允许同一账号多地同时登录 */}
                <Controller
                  control={form.control}
                  name="isConcurrent"
                  render={({ field, fieldState }) => (
                    <Field
                      orientation="horizontal"
                      className="items-center justify-between py-1 sm:col-span-2"
                      data-invalid={fieldState.invalid}
                    >
                      <FieldContent>
                        <FieldLabel>是否允许同一账号多地同时登录</FieldLabel>
                        <FieldDescription>新登录是否允许与旧登录共存</FieldDescription>
                      </FieldContent>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-invalid={fieldState.invalid}
                      />
                    </Field>
                  )}
                />

                {/* 顶人下线的范围（isConcurrent=false 时生效且必选） */}
                <Controller
                  control={form.control}
                  name="replacedRange"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel>
                        顶人下线的范围
                        {!isConcurrent && <span className="text-destructive">*</span>}
                      </FieldLabel>
                      <Select
                        items={replacedRangeOptions}
                        value={field.value || ''}
                        disabled={isConcurrent}
                        onValueChange={val => field.onChange(val || undefined)}
                      >
                        <SelectTrigger className="w-full" aria-invalid={fieldState.invalid}>
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
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                {/* 同一账号最大登录数量（isConcurrent=true 时有效） */}
                <Controller
                  control={form.control}
                  name="maxLoginCount"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel className="flex items-center gap-1">
                        <span>同一账号最大登录数量</span>
                        <Tooltip>
                          <TooltipTrigger render={<span className="inline-flex cursor-help text-muted-foreground" />}>
                            <HelpCircle className="size-3.5" />
                          </TooltipTrigger>
                          <TooltipContent side="top">-1：不限制</TooltipContent>
                        </Tooltip>
                      </FieldLabel>
                      <div className="relative">
                        <Input
                          type="number"
                          value={field.value}
                          disabled={!isConcurrent}
                          onChange={e =>
                            field.onChange(Number.isNaN(e.target.valueAsNumber) ? -1 : e.target.valueAsNumber)
                          }
                          className="pr-10"
                          aria-invalid={fieldState.invalid}
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                          个
                        </span>
                      </div>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                {/* 溢出人数的下线方式 */}
                <Controller
                  control={form.control}
                  name="overflowLogoutMode"
                  render={({ field, fieldState }) => {
                    const disabled = !isConcurrent || maxLoginCount === -1 || maxLoginCount === 0
                    return (
                      <Field className="gap-1.5 sm:col-span-2" data-invalid={fieldState.invalid}>
                        <FieldLabel>
                          溢出人数的下线方式
                          {!disabled && <span className="text-destructive">*</span>}
                        </FieldLabel>
                        <Select
                          items={logoutModeOptions}
                          value={field.value || ''}
                          disabled={disabled}
                          onValueChange={val => field.onChange(val || undefined)}
                        >
                          <SelectTrigger className="w-full" aria-invalid={fieldState.invalid}>
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
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )
                  }}
                />

                {/* 状态 */}
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field, fieldState }) => (
                    <Field
                      orientation="horizontal"
                      className="items-center justify-between py-1 sm:col-span-2"
                      data-invalid={fieldState.invalid}
                    >
                      <FieldContent>
                        <FieldLabel>状态</FieldLabel>
                        <FieldDescription>启用或禁用该客户端通道</FieldDescription>
                      </FieldContent>
                      <Switch
                        checked={field.value === 1}
                        onCheckedChange={checked => field.onChange(checked ? 1 : 2)}
                        aria-invalid={fieldState.invalid}
                      />
                    </Field>
                  )}
                />
              </FieldGroup>
            </div>

            <DrawerFooter className="flex-row justify-end gap-2 border-t p-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={saveMutation.isPending}>
                取消
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Spinner className="size-4" />}
                保存
              </Button>
            </DrawerFooter>
          </form>
        )}
      </DrawerContent>
    </Drawer>
  )
}
