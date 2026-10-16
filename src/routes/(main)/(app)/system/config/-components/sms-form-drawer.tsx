import * as React from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { MessageSquare, X } from 'lucide-react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { createSmsConfig, getSmsConfig, type SmsConfigReq, updateSmsConfig } from '@/lib/api/sms'
import { smsKeys } from '@/lib/query-keys'

const smsFormSchema = z.object({
  name: z.string().trim().min(1, '请输入配置名称').max(100, '配置名称不能超过 100 个字符'),
  supplier: z.string().min(1, '请选择服务厂商'),
  accessKey: z.string().trim().min(1, '请输入 Access Key').max(255, 'Access Key 不能超过 255 个字符'),
  secretKey: z.string().max(255, 'Secret Key 不能超过 255 个字符'),
  signature: z.string().max(100, '短信签名不能超过 100 个字符'),
  templateId: z.string().trim().min(1, '请输入模板 ID').max(50, '模板 ID 不能超过 50 个字符'),
  weight: z.number().int('权重必须为整数').min(1, '权重最小为 1').max(100, '权重最大为 100'),
  retryInterval: z.number().int('重试间隔必须为整数').min(1, '重试间隔最小为 1 秒'),
  maxRetries: z.number().int('重试次数必须为整数').min(0, '重试次数最小为 0'),
  maximum: z.number().int('发送上限必须为整数').min(1, '发送上限最小为 1'),
  supplierConfig: z.string().refine(val => {
    if (!val || !val.trim()) return true
    try {
      JSON.parse(val)
      return true
    } catch {
      return false
    }
  }, '扩展配置必须为合法的 JSON 格式'),
  status: z.number().int().min(1).max(2)
})

type FormValues = z.infer<typeof smsFormSchema>

const DEFAULT_FORM: FormValues = {
  name: '',
  supplier: 'alibaba',
  accessKey: '',
  secretKey: '',
  signature: '',
  templateId: '',
  weight: 1,
  retryInterval: 5,
  maxRetries: 0,
  maximum: 100,
  supplierConfig: '',
  status: 1
}

function SmsFormSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-16 w-full" />
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

interface SmsFormDrawerProps {
  readonly smsId: string | number | null
  readonly open: boolean
  readonly supplierOptions: Array<{ label: string; value: string }>
  readonly onClose: () => void
}

export function SmsFormDrawer({ smsId, open, supplierOptions, onClose }: SmsFormDrawerProps) {
  const queryClient = useQueryClient()
  const isEdit = smsId !== null

  const detailQuery = useQuery({
    queryKey: smsKeys.detail(smsId ?? ''),
    queryFn: () => getSmsConfig(smsId!),
    enabled: open && isEdit
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(smsFormSchema),
    defaultValues: DEFAULT_FORM
  })

  React.useEffect(() => {
    if (open) {
      if (isEdit && detailQuery.data) {
        const detail = detailQuery.data
        form.reset({
          name: detail.name ?? '',
          supplier: detail.supplier ?? (supplierOptions[0]?.value || 'alibaba'),
          accessKey: detail.accessKey ?? '',
          secretKey: '',
          signature: detail.signature ?? '',
          templateId: detail.templateId ?? '',
          weight: detail.weight ?? 1,
          retryInterval: detail.retryInterval ?? 5,
          maxRetries: detail.maxRetries ?? 0,
          maximum: detail.maximum ?? 100,
          supplierConfig: detail.supplierConfig ?? '',
          status: detail.status ?? 1
        })
      } else if (!isEdit) {
        form.reset({
          ...DEFAULT_FORM,
          supplier: supplierOptions[0]?.value || 'alibaba'
        })
      }
    }
  }, [open, isEdit, detailQuery.data, form, supplierOptions])

  const onSubmit = async (values: FormValues) => {
    if (!isEdit && !values.secretKey.trim()) {
      form.setError('secretKey', { message: '请输入 Secret Key' })
      return
    }

    try {
      const payload: SmsConfigReq = {
        name: values.name.trim(),
        supplier: values.supplier,
        accessKey: values.accessKey.trim(),
        secretKey: values.secretKey.trim() || undefined!,
        signature: values.signature.trim() || undefined,
        templateId: values.templateId.trim(),
        weight: values.weight,
        retryInterval: values.retryInterval,
        maxRetries: values.maxRetries,
        maximum: values.maximum,
        supplierConfig: values.supplierConfig.trim() || undefined,
        status: values.status as 1 | 2
      }

      if (isEdit) {
        await updateSmsConfig(smsId!, payload)
        toast.add({ title: '修改短信配置成功', type: 'success' })
      } else {
        await createSmsConfig(payload)
        toast.add({ title: '新增短信配置成功', type: 'success' })
      }

      void queryClient.invalidateQueries({ queryKey: smsKeys.all })
      onClose()
    } catch {
      // The HTTP layer handles and displays the error message
    }
  }

  const isLoading = isEdit && detailQuery.isLoading

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
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:32rem]">
        <DrawerHeader className="flex-row items-center justify-between gap-2 border-b p-4 md:gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4" />
            <DrawerTitle>{isEdit ? '修改短信配置' : '新增短信配置'}</DrawerTitle>
          </div>
          <DrawerClose render={<Button variant="ghost" size="icon-sm" disabled={form.formState.isSubmitting} />}>
            <X className="size-4" />
            <span className="sr-only">关闭</span>
          </DrawerClose>
        </DrawerHeader>

        {isLoading ? (
          <SmsFormSkeleton onClose={onClose} />
        ) : (
          <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
              <FieldGroup className="gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Controller
                    control={form.control}
                    name="name"
                    render={({ field, fieldState }) => (
                      <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                        <FieldLabel>
                          配置名称<span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                          {...field}
                          maxLength={100}
                          placeholder="请输入配置名称"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="supplier"
                    render={({ field, fieldState }) => (
                      <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                        <FieldLabel>
                          服务厂商<span className="text-destructive">*</span>
                        </FieldLabel>
                        <Select
                          items={supplierOptions}
                          value={field.value}
                          onValueChange={val => {
                            if (!val) return
                            field.onChange(val)
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="请选择服务厂商" />
                          </SelectTrigger>
                          <SelectContent align="start" alignItemWithTrigger={false}>
                            <SelectGroup>
                              {supplierOptions.map(s => (
                                <SelectItem key={s.value} value={s.value}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                </div>

                <Controller
                  control={form.control}
                  name="accessKey"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel>
                        Access Key<span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        {...field}
                        maxLength={255}
                        placeholder="请输入 Access Key"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="secretKey"
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel>Secret Key{!isEdit && <span className="text-destructive">*</span>}</FieldLabel>
                      <PasswordInput
                        {...field}
                        maxLength={255}
                        placeholder={isEdit ? '留空表示不修改' : '请输入 Secret Key'}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Controller
                    control={form.control}
                    name="signature"
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel>短信签名</FieldLabel>
                        <Input
                          {...field}
                          maxLength={100}
                          placeholder="请输入短信签名"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="templateId"
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel>
                          模板 ID<span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                          {...field}
                          maxLength={50}
                          placeholder="请输入模板 ID"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Controller
                    control={form.control}
                    name="weight"
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel>负载均衡权重</FieldLabel>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={field.value}
                          onChange={e =>
                            field.onChange(Number.isNaN(e.target.valueAsNumber) ? 1 : e.target.valueAsNumber)
                          }
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="retryInterval"
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel>重试间隔</FieldLabel>
                        <div className="relative">
                          <Input
                            type="number"
                            min={1}
                            value={field.value}
                            onChange={e =>
                              field.onChange(Number.isNaN(e.target.valueAsNumber) ? 1 : e.target.valueAsNumber)
                            }
                            className="pr-10"
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                            秒
                          </span>
                        </div>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Controller
                    control={form.control}
                    name="maxRetries"
                    render={({ field, fieldState }) => (
                      <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                        <FieldLabel>重试次数</FieldLabel>
                        <Input
                          type="number"
                          min={0}
                          value={field.value}
                          onChange={e =>
                            field.onChange(Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)
                          }
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="maximum"
                    render={({ field, fieldState }) => (
                      <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                        <FieldLabel>发送上限</FieldLabel>
                        <Input
                          type="number"
                          min={1}
                          value={field.value}
                          onChange={e =>
                            field.onChange(Number.isNaN(e.target.valueAsNumber) ? 1 : e.target.valueAsNumber)
                          }
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                </div>

                <Controller
                  control={form.control}
                  name="supplierConfig"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldContent>
                        <FieldLabel>厂商独立扩展配置</FieldLabel>
                        <FieldDescription>针对特定供应商（如腾讯云 sdkAppId）的专有扩展参数</FieldDescription>
                      </FieldContent>
                      <Textarea
                        {...field}
                        rows={2}
                        maxLength={500}
                        placeholder="请输入厂商的（JSON 格式）扩展配置"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="status"
                  render={({ field, fieldState }) => (
                    <Field
                      orientation="horizontal"
                      className="items-center justify-between py-1"
                      data-invalid={fieldState.invalid}
                    >
                      <FieldContent>
                        <FieldLabel className="cursor-pointer">状态</FieldLabel>
                        <FieldDescription>禁用后该通道将不再参与短信发送</FieldDescription>
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
              <Button type="button" variant="outline" disabled={form.formState.isSubmitting} onClick={onClose}>
                取消
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Spinner />
                    保存中
                  </>
                ) : (
                  '保存'
                )}
              </Button>
            </DrawerFooter>
          </form>
        )}
      </DrawerContent>
    </Drawer>
  )
}
