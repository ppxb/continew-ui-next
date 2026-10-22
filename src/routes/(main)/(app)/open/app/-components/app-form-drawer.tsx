import * as React from 'react'

import { revalidateLogic, useForm, useSelector } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { addDays, addYears, format } from 'date-fns'
import { z } from 'zod'

import { Calendar as CalendarIcon, Clock, LayoutGrid, X } from 'lucide-react'

import { EntityDrawer } from '@/components/entity-drawer'
import { RequiredMark } from '@/components/required-mark'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { DrawerFooter } from '@/components/ui/drawer'
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

/** The backend sends `yyyy-MM-dd HH:mm:ss`; Safari needs the dashes replaced to parse it. */
const toSelectedDate = (value: string) => {
  if (!value) return undefined
  const date = new Date(value.replace(/-/g, '/'))
  return Number.isNaN(date.getTime()) ? undefined : date
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
  const formRef = React.useRef<HTMLFormElement>(null)
  const [calendarOpen, setCalendarOpen] = React.useState(false)

  const detailQuery = useAppDetail(appId, { enabled: open && isEdit, refreshOnOpen: isEdit })

  const form = useForm({
    defaultValues: EMPTY_FORM,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    onSubmit: async ({ value }) => {
      const payload: AppReq = {
        name: value.name,
        status: value.status as AppStatus,
        expireTime: value.expireTime ? value.expireTime : null,
        description: value.description || undefined
      }

      try {
        if (appId === null) {
          await createApp(payload)
        } else {
          await updateApp(appId, payload)
        }
      } catch {
        // The HTTP layer already reported the failure.
        return
      }

      toast.add({ title: isEdit ? '修改应用成功' : '新增应用成功', type: 'success' })
      void queryClient.invalidateQueries({ queryKey: appKeys.all })
      onClose()
    }
  })

  // `form.state` is a render-time snapshot, so the "saving" flag comes from a subscription. It covers
  // the whole request, which is what the close guard and every disabled control below rely on.
  const isSubmitting = useSelector(form.store, state => state.isSubmitting)

  // Fill the form once per open, and only after the record has settled. `keepDefaultValues` is
  // load-bearing: `reset(values)` otherwise rewrites the form's own defaults, and the next render's
  // `update(opts)` reads that as "defaults changed" and puts `EMPTY_FORM` back into the fields.
  const filledForRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!open) {
      form.reset({ ...EMPTY_FORM }, { keepDefaultValues: true })
      filledForRef.current = null
      return
    }

    if (!isEdit) {
      if (filledForRef.current === 'create') return
      filledForRef.current = 'create'
      form.reset({ ...EMPTY_FORM }, { keepDefaultValues: true })
      return
    }

    if (!detailQuery.data) return

    const key = `${String(appId)}:${detailQuery.dataUpdatedAt}`
    if (filledForRef.current === key) return
    filledForRef.current = key
    form.reset(toFormValues(detailQuery.data), { keepDefaultValues: true })
  }, [open, isEdit, appId, detailQuery.data, detailQuery.dataUpdatedAt, form])

  /**
   * Validates the whole object before submitting: `handleSubmit` returns as soon as the field
   * validators report an invalid form, so a rule that only sits on the form would stay hidden until
   * the other errors were fixed.
   */
  const submit = async () => {
    await form.validate('submit')
    await form.handleSubmit()

    // TanStack Form does not move focus to the first invalid control, so the drawer does it here.
    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    })
  }

  const isLoadingDetail = isEdit && (detailQuery.isPending || detailQuery.fetchStatus !== 'idle')
  const isDetailError = isEdit && !isLoadingDetail && detailQuery.isError

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? '修改应用' : '新增应用'}
      icon={
        <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          <LayoutGrid className="size-4" />
        </div>
      }
      width={30}
      closeDisabled={isSubmitting}
      canClose={() => !isSubmitting}
    >

        {isLoadingDetail ? (
          <AppFormSkeleton />
        ) : isDetailError ? (
          <p className="p-4 text-sm text-foreground">加载失败，请稍后重试</p>
        ) : (
          <form
            ref={formRef}
            noValidate
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={event => {
              event.preventDefault()
              void submit()
            }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
              <FieldGroup className="gap-4">
                {/* Name field (Required, upfront) */}
                <form.Field name="name" validators={{ onDynamic: formSchema.shape.name }}>
                  {field => {
                    const invalid = field.state.meta.errors.length > 0

                    return (
                      <Field className="gap-1.5" data-invalid={invalid}>
                        <FieldLabel htmlFor="app-name">
                          应用名称
                          <RequiredMark />
                        </FieldLabel>
                        <Input
                          id="app-name"
                          name="name"
                          value={field.state.value}
                          onChange={event => field.handleChange(event.target.value)}
                          onBlur={field.handleBlur}
                          placeholder="请输入应用名称，例如：商城接口服务"
                          disabled={isSubmitting}
                          aria-invalid={invalid}
                        />
                        <FieldError errors={field.state.meta.errors} />
                      </Field>
                    )
                  }}
                </form.Field>

                {/* Expiration Time (Optional, with calendar & quick presets) */}
                <form.Field name="expireTime" validators={{ onDynamic: formSchema.shape.expireTime }}>
                  {field => {
                    const invalid = field.state.meta.errors.length > 0
                    const hasValue = field.state.value !== ''
                    const selectedDate = toSelectedDate(field.state.value)

                    const setExpire = (value: string) => {
                      field.handleChange(value)
                      setCalendarOpen(false)
                    }

                    return (
                      <Field className="gap-1.5" data-invalid={invalid}>
                        <FieldLabel htmlFor="app-expire-time">失效时间</FieldLabel>
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                          <div className="relative flex items-center">
                            <PopoverTrigger
                              render={
                                <Button
                                  type="button"
                                  id="app-expire-time"
                                  variant="outline"
                                  disabled={isSubmitting}
                                  className="w-full justify-between pr-8 font-normal"
                                />
                              }
                            >
                              <span className={hasValue ? 'text-foreground' : 'text-muted-foreground'}>
                                {hasValue ? field.state.value : '永久有效（点击设置失效时间）'}
                              </span>
                              <CalendarIcon className="size-4 text-muted-foreground" />
                            </PopoverTrigger>

                            {hasValue ? (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation()
                                  setExpire('')
                                }}
                                disabled={isSubmitting}
                                className="absolute right-2.5 z-10 text-muted-foreground transition-colors hover:text-foreground"
                                title="清空并设为永久有效"
                              >
                                <X className="size-3.5" />
                              </button>
                            ) : null}
                          </div>

                          <PopoverContent className="w-auto p-3" align="start">
                            {/* The presets and the calendar have no single `disabled` prop to hang the
                                saving state on, so `inert` covers the whole popover body at once. */}
                            <div className="flex flex-col gap-3" inert={isSubmitting}>
                              <div className="flex flex-wrap items-center gap-1.5 border-b pb-2">
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="outline"
                                  onClick={() => setExpire(format(addDays(new Date(), 30), 'yyyy-MM-dd 23:59:59'))}
                                >
                                  30天
                                </Button>
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="outline"
                                  onClick={() => setExpire(format(addDays(new Date(), 90), 'yyyy-MM-dd 23:59:59'))}
                                >
                                  90天
                                </Button>
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="outline"
                                  onClick={() => setExpire(format(addYears(new Date(), 1), 'yyyy-MM-dd 23:59:59'))}
                                >
                                  1年
                                </Button>
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="outline"
                                  onClick={() => setExpire(format(addYears(new Date(), 3), 'yyyy-MM-dd 23:59:59'))}
                                >
                                  3年
                                </Button>
                                <Button type="button" size="xs" variant="ghost" onClick={() => setExpire('')}>
                                  永久有效
                                </Button>
                              </div>

                              <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={date => {
                                  setExpire(date ? format(date, 'yyyy-MM-dd 23:59:59') : '')
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
                        <FieldError errors={field.state.meta.errors} />
                      </Field>
                    )
                  }}
                </form.Field>

                {/* Status Switch (One per line, placed below expire time) */}
                <form.Field name="status" validators={{ onDynamic: formSchema.shape.status }}>
                  {field => {
                    const invalid = field.state.meta.errors.length > 0

                    return (
                      <Field orientation="horizontal" className="items-center justify-between" data-invalid={invalid}>
                        <FieldContent>
                          <FieldLabel>应用状态</FieldLabel>
                          <FieldDescription>
                            {field.state.value === 1 ? '启用状态，允许调用开放 API 接口' : '禁用状态，阻止所有调用请求'}
                          </FieldDescription>
                        </FieldContent>
                        <Switch
                          checked={field.state.value === 1}
                          onCheckedChange={checked => field.handleChange(checked ? 1 : 2)}
                          disabled={isSubmitting}
                          aria-invalid={invalid}
                        />
                      </Field>
                    )
                  }}
                </form.Field>

                {/* Description field */}
                <form.Field name="description" validators={{ onDynamic: formSchema.shape.description }}>
                  {field => {
                    const invalid = field.state.meta.errors.length > 0

                    return (
                      <Field className="gap-1.5" data-invalid={invalid}>
                        <FieldLabel htmlFor="app-description">应用描述</FieldLabel>
                        <Textarea
                          id="app-description"
                          name="description"
                          value={field.state.value}
                          onChange={event => field.handleChange(event.target.value)}
                          onBlur={field.handleBlur}
                          placeholder="请输入应用描述信息（选填，最大 200 字）"
                          rows={3}
                          disabled={isSubmitting}
                          aria-invalid={invalid}
                        />
                        <FieldError errors={field.state.meta.errors} />
                      </Field>
                    )
                  }}
                </form.Field>
              </FieldGroup>
            </div>

            <DrawerFooter className="border-t p-4">
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
                  取消
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
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
    </EntityDrawer>
  )
}
