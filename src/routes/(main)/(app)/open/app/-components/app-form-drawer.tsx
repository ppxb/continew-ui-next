import * as React from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addDays, addYears, format } from 'date-fns'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { Calendar as CalendarIcon, Clock, LayoutGrid, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { appKeys, createApp, type AppDetailResp, type AppReq, type AppStatus, updateApp } from '@/lib/api/app'

import { useAppDetail } from './use-app-detail'

const formSchema = z.object({
  name: z.string().trim().min(1, '应用名称不能为空').max(100, '应用名称长度不能超过 100 个字符'),
  status: z.number().int().min(1).max(2),
  expireTime: z.string().refine(val => {
    if (!val) return true
    const date = new Date(val.replace(/-/g, '/'))
    return !Number.isNaN(date.getTime()) && date.getTime() > Date.now()
  }, '失效时间必须是未来时间'),
  description: z.string().max(200, '描述长度不能超过 200 个字符')
})

type FormValues = z.infer<typeof formSchema>

const EMPTY_FORM: FormValues = {
  name: '',
  status: 1,
  expireTime: '',
  description: ''
}

function toFormValues(app: AppDetailResp): FormValues {
  return {
    name: app.name ?? '',
    status: app.status ?? 1,
    expireTime: app.expireTime ?? '',
    description: app.description ?? ''
  }
}

function AppFormSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-3.5 w-48" />
        </div>
        <div className="flex items-center justify-between py-1">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3.5 w-48" />
          </div>
          <Skeleton className="h-5 w-9 rounded-full" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  )
}

interface AppFormDrawerProps {
  /** The app being edited, or `null` when creating a new app. */
  readonly appId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

export function AppFormDrawer({ appId, open, onClose }: AppFormDrawerProps) {
  const isEdit = appId !== null
  const queryClient = useQueryClient()
  const [calendarOpen, setCalendarOpen] = React.useState(false)

  const detailQuery = useAppDetail(appId, { enabled: open && isEdit, refreshOnOpen: isEdit })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY_FORM
  })

  // Synchronize form values whenever the drawer opens or the record changes
  React.useEffect(() => {
    if (!open) {
      form.reset(EMPTY_FORM)
      return
    }

    if (isEdit && detailQuery.data) {
      form.reset(toFormValues(detailQuery.data))
    } else if (!isEdit) {
      form.reset(EMPTY_FORM)
    }
  }, [open, isEdit, detailQuery.data, form])

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: AppReq = {
        name: values.name,
        status: values.status as AppStatus,
        expireTime: values.expireTime ? values.expireTime : null,
        description: values.description || undefined
      }

      if (isEdit && appId !== null) {
        await updateApp(appId, payload)
      } else {
        await createApp(payload)
      }
    },
    onSuccess: () => {
      toast.add({
        title: isEdit ? '修改应用成功' : '新增应用成功',
        type: 'success'
      })
      void queryClient.invalidateQueries({ queryKey: appKeys.all })
      onClose()
    },
    onError: error => {
      toast.add({
        title: error instanceof Error ? error.message : '提交失败，请重试',
        type: 'error'
      })
    }
  })

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values)
  }

  const expireTimeValue = useWatch({ control: form.control, name: 'expireTime' })
  const selectedDate = React.useMemo(() => {
    if (!expireTimeValue) return undefined
    const d = new Date(expireTimeValue.replace(/-/g, '/'))
    return Number.isNaN(d.getTime()) ? undefined : d
  }, [expireTimeValue])

  const setPresetExpire = (days: number) => {
    const target = addDays(new Date(), days)
    form.setValue('expireTime', format(target, 'yyyy-MM-dd 23:59:59'), { shouldValidate: true })
    setCalendarOpen(false)
  }

  const setPresetYears = (years: number) => {
    const target = addYears(new Date(), years)
    form.setValue('expireTime', format(target, 'yyyy-MM-dd 23:59:59'), { shouldValidate: true })
    setCalendarOpen(false)
  }

  const clearExpire = () => {
    form.setValue('expireTime', '', { shouldValidate: true })
    setCalendarOpen(false)
  }

  const isLoadingDetail = isEdit && (detailQuery.isPending || detailQuery.fetchStatus !== 'idle')
  const isDetailError = isEdit && !isLoadingDetail && detailQuery.isError

  return (
    <Drawer
      open={open}
      onOpenChange={val => {
        if (!val && !mutation.isPending) {
          onClose()
        }
      }}
      swipeDirection="right"
    >
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:30rem]">
        <DrawerHeader className="flex-row items-center justify-between gap-2 border-b p-4 md:gap-2">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <LayoutGrid className="size-4" />
            </div>
            <DrawerTitle className="text-base font-semibold">{isEdit ? '修改应用' : '新增应用'}</DrawerTitle>
          </div>
          <DrawerClose render={<Button variant="ghost" size="icon-sm" disabled={mutation.isPending} />}>
            <X className="size-4" />
            <span className="sr-only">关闭</span>
          </DrawerClose>
        </DrawerHeader>

        {isLoadingDetail ? (
          <AppFormSkeleton />
        ) : isDetailError ? (
          <p className="p-4 text-sm text-foreground">加载失败，请稍后重试</p>
        ) : (
          <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
              <FieldGroup className="gap-4">
                {/* Name field (Required, upfront) */}
                <Controller
                  control={form.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="app-name">
                        应用名称
                        <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        {...field}
                        id="app-name"
                        placeholder="请输入应用名称，例如：商城接口服务"
                        disabled={mutation.isPending}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                {/* Expiration Time (Optional, with calendar & quick presets) */}
                <Controller
                  control={form.control}
                  name="expireTime"
                  render={({ field, fieldState }) => {
                    const hasValue = Boolean(field.value)

                    return (
                      <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="app-expire-time">失效时间</FieldLabel>
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                          <div className="relative flex items-center">
                            <PopoverTrigger
                              render={
                                <Button
                                  type="button"
                                  id="app-expire-time"
                                  variant="outline"
                                  disabled={mutation.isPending}
                                  className="w-full justify-between pr-8 font-normal"
                                />
                              }
                            >
                              <span className={hasValue ? 'text-foreground' : 'text-muted-foreground'}>
                                {hasValue ? field.value : '永久有效（点击设置失效时间）'}
                              </span>
                              <CalendarIcon className="size-4 text-muted-foreground" />
                            </PopoverTrigger>

                            {hasValue ? (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation()
                                  clearExpire()
                                }}
                                className="absolute right-2.5 z-10 text-muted-foreground transition-colors hover:text-foreground"
                                title="清空并设为永久有效"
                              >
                                <X className="size-3.5" />
                              </button>
                            ) : null}
                          </div>

                          <PopoverContent className="w-auto p-3" align="start">
                            <div className="flex flex-col gap-3">
                              <div className="flex flex-wrap items-center gap-1.5 border-b pb-2">
                                <Button type="button" size="xs" variant="outline" onClick={() => setPresetExpire(30)}>
                                  30天
                                </Button>
                                <Button type="button" size="xs" variant="outline" onClick={() => setPresetExpire(90)}>
                                  90天
                                </Button>
                                <Button type="button" size="xs" variant="outline" onClick={() => setPresetYears(1)}>
                                  1年
                                </Button>
                                <Button type="button" size="xs" variant="outline" onClick={() => setPresetYears(3)}>
                                  3年
                                </Button>
                                <Button type="button" size="xs" variant="ghost" onClick={clearExpire}>
                                  永久有效
                                </Button>
                              </div>

                              <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={date => {
                                  if (!date) {
                                    clearExpire()
                                  } else {
                                    form.setValue('expireTime', format(date, 'yyyy-MM-dd 23:59:59'), {
                                      shouldValidate: true
                                    })
                                    setCalendarOpen(false)
                                  }
                                }}
                                disabled={date => date.getTime() < Date.now() - 24 * 60 * 60 * 1000}
                              />
                            </div>
                          </PopoverContent>
                        </Popover>
                        <FieldDescription>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            留空表示永久有效；若设置则必须是未来时间
                          </span>
                        </FieldDescription>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )
                  }}
                />

                {/* Status Switch (One per line, placed below expire time) */}
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Field orientation="horizontal" className="items-center justify-between">
                      <FieldContent>
                        <FieldLabel>应用状态</FieldLabel>
                        <FieldDescription>
                          {field.value === 1 ? '启用状态，允许调用开放 API 接口' : '禁用状态，阻止所有调用请求'}
                        </FieldDescription>
                      </FieldContent>
                      <Switch
                        checked={field.value === 1}
                        onCheckedChange={checked => field.onChange(checked ? 1 : 2)}
                        disabled={mutation.isPending}
                      />
                    </Field>
                  )}
                />

                {/* Description field */}
                <Controller
                  control={form.control}
                  name="description"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="app-description">应用描述</FieldLabel>
                      <Textarea
                        {...field}
                        id="app-description"
                        placeholder="请输入应用描述信息（选填，最大 200 字）"
                        rows={3}
                        disabled={mutation.isPending}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </FieldGroup>
            </div>

            <DrawerFooter className="border-t p-4">
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>
                  取消
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <>
                      <Spinner />
                      保存中
                    </>
                  ) : (
                    '保存'
                  )}
                </Button>
              </div>
            </DrawerFooter>
          </form>
        )}
      </DrawerContent>
    </Drawer>
  )
}
