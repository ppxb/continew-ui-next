import * as React from 'react'

import { revalidateLogic, useForm, useSelector } from '@tanstack/react-form'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'

import { Megaphone, UserPlus } from 'lucide-react'

import { z } from 'zod'

import { EntityDrawer } from '@/components/entity-drawer'
import { QueryState } from '@/components/query-state'
import { RequiredMark } from '@/components/required-mark'
import { RichTextEditor } from '@/components/rich-text-editor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DrawerFooter } from '@/components/ui/drawer'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import {
  createNotice,
  noticeKeys,
  updateNotice,
  type NoticeDetailResp,
  type NoticeReq,
  type NoticeScope,
  type NoticeStatus
} from '@/lib/api/notice'
import { getUser, listUsers, userKeys } from '@/lib/api/user'

import { NoticeStatusBadge } from './notice-display'
import { NoticePublishTimePicker } from './notice-publish-time-picker'
import { NoticeUserPicker } from './notice-user-picker'
import { useNoticeDetail } from './use-notice-detail'
import { useNoticeDicts } from './use-notice-dicts'

const formSchema = z
  .object({
    title: z.string().trim().min(1, '请输入标题').max(150, '标题长度不能超过 150 个字符'),
    type: z.string().min(1, '请选择分类'),
    content: z.string().refine(hasRichText, '请输入内容'),
    noticeScope: z.union([z.literal(1), z.literal(2)]),
    noticeUsers: z.array(z.string()),
    noticeMethods: z.array(z.number()).nullable(),
    isTiming: z.boolean(),
    publishTime: z.string().nullable(),
    isTop: z.boolean()
  })
  .superRefine((value, ctx) => {
    if (value.noticeScope === 2 && value.noticeUsers.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['noticeUsers'], message: '请选择通知用户' })
    }

    if (value.isTiming) {
      if (!value.publishTime) {
        ctx.addIssue({ code: 'custom', path: ['publishTime'], message: '请选择发布时间' })
      } else if (new Date(value.publishTime.replace(/-/g, '/')) <= new Date()) {
        ctx.addIssue({ code: 'custom', path: ['publishTime'], message: '发布时间不能早于当前时间' })
      }
    }
  })

type NoticeFormValues = z.infer<typeof formSchema>

function hasRichText(html: string) {
  return (
    html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim().length > 0
  )
}

const EMPTY_FORM: NoticeFormValues = {
  title: '',
  type: '',
  content: '',
  noticeScope: 1,
  noticeUsers: [],
  noticeMethods: [1],
  isTiming: false,
  publishTime: null,
  isTop: false
}

function toFormValues(detail: NoticeDetailResp): NoticeFormValues {
  return {
    title: detail.title,
    type: detail.type,
    content: detail.content,
    noticeScope: detail.noticeScope,
    noticeUsers: (detail.noticeUsers ?? []).map(String),
    noticeMethods: detail.noticeMethods,
    isTiming: detail.isTiming,
    publishTime: detail.publishTime,
    isTop: detail.isTop
  }
}

interface NoticeFormDrawerProps {
  readonly noticeId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

/** Creates or edits a notice; every action is a drawer, matching the user management screen. */
export function NoticeFormDrawer({ noticeId, open, onClose }: NoticeFormDrawerProps) {
  const queryClient = useQueryClient()
  const { typeOptions, scopeOptions, methodOptions, statusOptions } = useNoticeDicts()

  const isEdit = noticeId !== null
  const detailQuery = useNoticeDetail(noticeId, {
    enabled: open && noticeId !== null,
    refreshOnOpen: true
  })
  const detail = detailQuery.data
  const isPublished = detail?.status === 3

  const usersQuery = useQuery({
    queryKey: userKeys.list({ page: 1, size: 100 }),
    queryFn: ({ signal }) => listUsers({ page: 1, size: 100 }, signal),
    enabled: open
  })
  const users = usersQuery.data?.list ?? []

  const [userPickerOpen, setUserPickerOpen] = React.useState(false)
  const submitStatusRef = React.useRef<NoticeStatus>(3)
  const filledForRef = React.useRef<string | null>(null)

  const form = useForm({
    defaultValues: EMPTY_FORM,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    onSubmit: async ({ value }) => {
      const body: NoticeReq = {
        title: value.title.trim(),
        content: value.content,
        type: value.type,
        noticeScope: value.noticeScope,
        noticeUsers: value.noticeScope === 2 ? value.noticeUsers : null,
        noticeMethods: value.noticeMethods,
        isTiming: value.isTiming,
        publishTime: value.isTiming ? value.publishTime : null,
        isTop: value.isTop,
        status: submitStatusRef.current
      }

      try {
        if (noticeId === null) {
          await createNotice(body)
          toast.add({ title: '新增成功', type: 'success' })
        } else {
          await updateNotice(noticeId, body)
          toast.add({ title: '修改成功', type: 'success' })
        }

        void queryClient.invalidateQueries({ queryKey: noticeKeys.all })
        onClose()
      } catch {
        // The HTTP layer already reported the failure.
      }
    }
  })

  React.useEffect(() => {
    if (!open) {
      filledForRef.current = null
      setUserPickerOpen(false)
      return
    }

    if (noticeId === null) {
      if (filledForRef.current === 'create') {
        return
      }
      filledForRef.current = 'create'
      form.reset(EMPTY_FORM, { keepDefaultValues: true })
      return
    }

    if (!detail) {
      return
    }

    const key = `edit:${noticeId}:${detail.updateTime ?? ''}`
    if (filledForRef.current === key) {
      return
    }
    filledForRef.current = key
    form.reset(toFormValues(detail), { keepDefaultValues: true })
  }, [open, noticeId, detail, form])

  const submitAs = (status: NoticeStatus) => {
    submitStatusRef.current = status
    void form.handleSubmit()
  }

  const noticeScope = useSelector(form.store, state => state.values.noticeScope)
  const selectedUserIds = useSelector(form.store, state => state.values.noticeUsers)
  const knownUserNames = new Map(users.map(user => [String(user.id), user.nickname || user.username]))

  // The first page covers most notices; ids beyond it are resolved one by one.
  const unresolvedUserIds =
    noticeScope === 2
      ? Array.from(new Set(selectedUserIds.map(String).filter(id => !knownUserNames.has(id))))
      : []
  const unresolvedUserQueries = useQueries({
    queries: unresolvedUserIds.map(id => ({
      queryKey: userKeys.detail(id),
      queryFn: ({ signal }) => getUser(id, signal),
      enabled: open,
      staleTime: 5 * 60_000
    }))
  })

  unresolvedUserIds.forEach((id, index) => {
    const user = unresolvedUserQueries[index]?.data

    if (user) {
      knownUserNames.set(id, user.nickname || user.username)
    }
  })

  const getUserName = (id: string | number) => knownUserNames.get(String(id)) ?? `用户 ${id}`

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? '修改公告' : '新增公告'}
      icon={<Megaphone className="size-4" />}
      badge={isEdit && detail ? <NoticeStatusBadge status={detail.status} options={statusOptions} /> : undefined}
      width={48}
      canClose={() => !form.state.isSubmitting}
    >

        {isEdit && (detailQuery.isPending || detailQuery.fetchStatus !== 'idle') ? (
          <NoticeFormSkeleton onClose={onClose} />
        ) : isEdit && detailQuery.isError ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <QueryState state="error" className="p-6" onRetry={() => void detailQuery.refetch()} />
            <DrawerFooter className="flex-row justify-end gap-2 border-t p-4">
              <Button type="button" variant="outline" onClick={onClose}>
                取消
              </Button>
            </DrawerFooter>
          </div>
        ) : (
          <form
            noValidate
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={event => {
              event.preventDefault()
              submitAs(3)
            }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <form.Field name="title">
                  {field => {
                    const invalid = field.state.meta.errors.length > 0

                    return (
                      <Field className="gap-1.5 sm:col-span-2" data-invalid={invalid}>
                        <FieldLabel>
                          标题
                          <RequiredMark />
                        </FieldLabel>
                        <Input
                          name="title"
                          value={field.state.value}
                          maxLength={150}
                          placeholder="请输入公告标题"
                          aria-invalid={invalid}
                          onChange={event => field.handleChange(event.target.value)}
                          onBlur={field.handleBlur}
                        />
                        <FieldError errors={field.state.meta.errors} />
                      </Field>
                    )
                  }}
                </form.Field>

                <form.Field name="type">
                  {field => {
                    const invalid = field.state.meta.errors.length > 0

                    return (
                      <Field className="gap-1.5" data-invalid={invalid}>
                        <FieldLabel>
                          分类
                          <RequiredMark />
                        </FieldLabel>
                        <Select
                          items={typeOptions}
                          value={field.state.value}
                          onValueChange={value => field.handleChange(value ?? '')}
                        >
                          <SelectTrigger className="w-full" aria-invalid={invalid}>
                            <SelectValue placeholder="请选择分类" />
                          </SelectTrigger>
                          <SelectContent alignItemWithTrigger={false}>
                            <SelectGroup>
                              {typeOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FieldError errors={field.state.meta.errors} />
                      </Field>
                    )
                  }}
                </form.Field>

                <form.Field name="noticeScope">
                  {field => {
                    const invalid = field.state.meta.errors.length > 0

                    return (
                      <Field className="gap-1.5" data-invalid={invalid}>
                        <FieldLabel>
                          通知范围
                          <RequiredMark />
                        </FieldLabel>
                        <Select
                          items={scopeOptions}
                          value={String(field.state.value)}
                          disabled={isPublished}
                          onValueChange={value => field.handleChange(Number(value) as NoticeScope)}
                        >
                          <SelectTrigger className="w-full" aria-invalid={invalid} disabled={isPublished}>
                            <SelectValue placeholder="请选择通知范围" />
                          </SelectTrigger>
                          <SelectContent alignItemWithTrigger={false}>
                            <SelectGroup>
                              {scopeOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FieldError errors={field.state.meta.errors} />
                      </Field>
                    )
                  }}
                </form.Field>

                <form.Subscribe selector={state => state.values.noticeScope}>
                  {scope =>
                    scope === 2 ? (
                      <form.Field name="noticeUsers">
                        {field => {
                          const invalid = field.state.meta.errors.length > 0

                          return (
                            <Field className="gap-1.5 sm:col-span-2" data-invalid={invalid}>
                              <FieldLabel>
                                指定用户
                                <RequiredMark />
                              </FieldLabel>
                              <div className="flex flex-col gap-2 rounded-lg border p-3">
                                {field.state.value.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {field.state.value.map(id => (
                                      <Badge key={id} variant="secondary" className="font-normal">
                                        {getUserName(id)}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">尚未选择用户</p>
                                )}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="self-start"
                                  disabled={isPublished}
                                  onClick={() => setUserPickerOpen(true)}
                                >
                                  <UserPlus />
                                  选择用户
                                </Button>
                              </div>
                              <FieldDescription>
                                {isPublished ? '公告已发布，通知用户不可修改' : '只有选中的用户能收到该公告'}
                              </FieldDescription>
                              <FieldError errors={field.state.meta.errors} />
                            </Field>
                          )
                        }}
                      </form.Field>
                    ) : null
                  }
                </form.Subscribe>

                <form.Field name="noticeMethods">
                  {field => {
                    const selectedMethods = (field.state.value ?? []).map(String)

                    return (
                      <Field className="gap-1.5 sm:col-span-2">
                        <FieldLabel>通知方式</FieldLabel>
                        <Select
                          multiple
                          items={methodOptions}
                          value={selectedMethods}
                          disabled={isPublished}
                          onValueChange={values => field.handleChange(values.map(Number))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="请选择通知方式">
                              {(value: unknown) => {
                                const selected = Array.isArray(value) ? value.map(String) : []
                                return selected.length > 0
                                  ? methodOptions
                                      .filter(option => selected.includes(option.value))
                                      .map(option => option.label)
                                      .join('、')
                                  : '请选择通知方式'
                              }}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent alignItemWithTrigger={false}>
                            <SelectGroup>
                              {methodOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FieldDescription>可多选；不选则只保存公告，不推送消息</FieldDescription>
                      </Field>
                    )
                  }}
                </form.Field>

                <form.Field name="isTiming">
                  {field => (
                    <Field className="sm:col-span-2" orientation="horizontal">
                      <FieldContent>
                        <FieldLabel>定时发布</FieldLabel>
                        <FieldDescription>
                          {field.state.value ? '到达发布时间后自动发布' : '保存或发布时立即生效'}
                        </FieldDescription>
                      </FieldContent>
                      <Switch
                        checked={field.state.value}
                        disabled={isPublished}
                        onCheckedChange={checked => field.handleChange(checked)}
                      />
                    </Field>
                  )}
                </form.Field>

                <form.Subscribe selector={state => state.values.isTiming}>
                  {isTiming =>
                    isTiming ? (
                      <form.Field name="publishTime">
                        {field => {
                          const invalid = field.state.meta.errors.length > 0

                          return (
                            <Field className="gap-1.5 sm:col-span-2" data-invalid={invalid}>
                              <FieldLabel>
                                发布时间
                                <RequiredMark />
                              </FieldLabel>
                              <NoticePublishTimePicker
                                value={field.state.value}
                                disabled={isPublished}
                                invalid={invalid}
                                onChange={value => field.handleChange(value)}
                              />
                              <FieldError errors={field.state.meta.errors} />
                            </Field>
                          )
                        }}
                      </form.Field>
                    ) : null
                  }
                </form.Subscribe>

                <form.Field name="isTop">
                  {field => (
                    <Field className="sm:col-span-2" orientation="horizontal">
                      <FieldContent>
                        <FieldLabel>置顶</FieldLabel>
                        <FieldDescription>置顶公告在列表和通知中优先展示</FieldDescription>
                      </FieldContent>
                      <Switch checked={field.state.value} onCheckedChange={checked => field.handleChange(checked)} />
                    </Field>
                  )}
                </form.Field>

                <form.Field name="content">
                  {field => {
                    const invalid = field.state.meta.errors.length > 0

                    return (
                      <Field className="gap-1.5 sm:col-span-2" data-invalid={invalid}>
                        <FieldLabel>
                          内容
                          <RequiredMark />
                        </FieldLabel>
                        <RichTextEditor
                          value={field.state.value}
                          invalid={invalid}
                          onChange={html => field.handleChange(html)}
                        />
                        <FieldError errors={field.state.meta.errors} />
                      </Field>
                    )
                  }}
                </form.Field>
              </FieldGroup>
            </div>

            <DrawerFooter className="flex-row justify-end gap-2 border-t p-4">
              <form.Subscribe selector={state => state.isSubmitting}>
                {isSubmitting => (
                  <>
                    <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
                      取消
                    </Button>
                    {!isPublished ? (
                      <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => submitAs(1)}>
                        存草稿
                      </Button>
                    ) : null}
                    <Button type="button" disabled={isSubmitting} onClick={() => submitAs(3)}>
                      {isSubmitting ? (
                        <>
                          <Spinner />
                          {isPublished ? '保存中' : '发布中'}
                        </>
                      ) : isPublished ? (
                        '保存'
                      ) : (
                        '发布'
                      )}
                    </Button>
                  </>
                )}
              </form.Subscribe>
            </DrawerFooter>
          </form>
        )}

        <NoticeUserPicker
          open={userPickerOpen && !isPublished}
          selected={form.state.values.noticeUsers}
          onClose={() => setUserPickerOpen(false)}
          onConfirm={ids => {
            if (isPublished) {
              setUserPickerOpen(false)
              return
            }

            form.setFieldValue('noticeUsers', ids)
            setUserPickerOpen(false)
          }}
        />
    </EntityDrawer>
  )
}

function NoticeFormSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className={index === 0 || index === 7 ? 'flex flex-col gap-1.5 sm:col-span-2' : 'flex flex-col gap-1.5'}
            >
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
      <DrawerFooter className="flex-row justify-end gap-2 border-t p-4">
        <Button type="button" variant="outline" onClick={onClose}>
          取消
        </Button>
      </DrawerFooter>
    </div>
  )
}
