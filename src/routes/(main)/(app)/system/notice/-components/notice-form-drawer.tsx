import * as React from 'react'

import { revalidateLogic, useSelector } from '@tanstack/react-form'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'

import { Megaphone, UserPlus } from 'lucide-react'

import { z } from 'zod'

import { EntityDrawer } from '@/components/entity-drawer'
import { useAppForm } from '@/components/form'
import { QueryState } from '@/components/query-state'
import { RichTextEditor } from '@/components/rich-text-editor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DrawerFooter } from '@/components/ui/drawer'
import { FieldGroup } from '@/components/ui/field'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { useFillFormOnce } from '@/hooks/use-fill-form-once'
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

function hasRichText(html: string) {
  return (
    html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim().length > 0
  )
}

const formSchema = z
  .object({
    title: z.string().trim().min(1, '请输入标题').max(150, '标题长度不能超过 150 个字符'),
    type: z.string().min(1, '请选择分类'),
    content: z.string().refine(hasRichText, '请输入内容'),
    // Kept as a string because the dict options carry string values; the request body turns it back.
    noticeScope: z.enum(['1', '2']),
    noticeUsers: z.array(z.string()),
    noticeMethods: z.array(z.number()).nullable(),
    isTiming: z.boolean(),
    publishTime: z.string().nullable(),
    isTop: z.boolean()
  })
  .superRefine((value, ctx) => {
    if (value.noticeScope === '2' && value.noticeUsers.length === 0) {
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

const EMPTY_FORM: NoticeFormValues = {
  title: '',
  type: '',
  content: '',
  noticeScope: '1',
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
    noticeScope: String(detail.noticeScope) as NoticeFormValues['noticeScope'],
    noticeUsers: (detail.noticeUsers ?? []).map(String),
    noticeMethods: detail.noticeMethods,
    isTiming: detail.isTiming,
    publishTime: detail.publishTime,
    isTop: detail.isTop
  }
}

interface NoticeFormDrawerProps {
  /** The notice being edited, or `null` to create one. */
  readonly noticeId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

/** Creates or edits a notice; every action is a drawer, matching the user management screen. */
export function NoticeFormDrawer({ noticeId, open, onClose }: NoticeFormDrawerProps) {
  const queryClient = useQueryClient()
  const { typeOptions, scopeOptions, methodOptions, statusOptions } = useNoticeDicts()

  const isEdit = noticeId !== null
  const detailQuery = useNoticeDetail(noticeId, { enabled: open })
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

  const finish = (message: string) => {
    onClose()
    void queryClient.invalidateQueries({ queryKey: noticeKeys.all })
    toast.add({ title: message, type: 'success' })
  }

  const form = useAppForm({
    defaultValues: EMPTY_FORM,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    onSubmit: async ({ value }) => {
      const body: NoticeReq = {
        title: value.title.trim(),
        content: value.content,
        type: value.type,
        noticeScope: Number(value.noticeScope) as NoticeScope,
        noticeUsers: value.noticeScope === '2' ? value.noticeUsers : null,
        noticeMethods: value.noticeMethods,
        isTiming: value.isTiming,
        publishTime: value.isTiming ? value.publishTime : null,
        isTop: value.isTop,
        status: submitStatusRef.current
      }

      try {
        if (noticeId === null) {
          await createNotice(body)
          finish('新增成功')
          return
        }

        await updateNotice(noticeId, body)
        finish('修改成功')
      } catch {
        // The HTTP layer already reported the failure.
      }
    }
  })

  useFillFormOnce({
    open,
    isEdit: noticeId !== null,
    entityKey: noticeId,
    record: detail,
    version: detailQuery.dataUpdatedAt,
    buildValues: ({ isEdit: editing, record }) => (editing && record ? toFormValues(record) : EMPTY_FORM),
    apply: values => form.reset(values, { keepDefaultValues: true }),
    onFilled: ({ isEdit: editing }) => {
      if (!editing) setUserPickerOpen(false)
    }
  })

  const submitAs = (status: NoticeStatus) => {
    submitStatusRef.current = status
    void form.handleSubmit()
  }

  const noticeScope = useSelector(form.store, state => state.values.noticeScope)
  const noticeUserIds = useSelector(form.store, state => state.values.noticeUsers)
  const isTiming = useSelector(form.store, state => state.values.isTiming)

  // The first user page covers most picks; ids beyond it are resolved one by one.
  const userNames = new Map(users.map(user => [String(user.id), user.nickname || user.username]))
  const unknownUserIds = noticeScope === '2' ? Array.from(new Set(noticeUserIds.filter(id => !userNames.has(id)))) : []

  const unknownUserQueries = useQueries({
    queries: unknownUserIds.map(id => ({
      queryKey: userKeys.detail(id),
      queryFn: ({ signal }) => getUser(id, signal),
      enabled: open
    }))
  })

  unknownUserQueries.forEach(query => {
    if (query.data) {
      userNames.set(String(query.data.id), query.data.nickname || query.data.username)
    }
  })

  const getUserName = (id: string) => userNames.get(id) ?? `用户 ${id}`

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
      {!isEdit || (detail && !detailQuery.isError && detailQuery.fetchStatus === 'idle') ? (
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
              <form.AppField name="title">
                {field => (
                  <field.TextInput
                    label="标题"
                    required
                    maxLength={150}
                    placeholder="请输入公告标题"
                    className="sm:col-span-2"
                  />
                )}
              </form.AppField>

              <form.AppField name="type">
                {field => <field.SelectInput label="分类" required options={typeOptions} placeholder="请选择分类" />}
              </form.AppField>

              <form.AppField name="noticeScope">
                {field => (
                  <field.SelectInput
                    label="通知范围"
                    required
                    options={scopeOptions}
                    placeholder="请选择通知范围"
                    disabled={isPublished}
                  />
                )}
              </form.AppField>

              {noticeScope === '2' && (
                <form.AppField name="noticeUsers">
                  {field => (
                    <field.CustomField
                      label="指定用户"
                      required
                      description={isPublished ? '公告已发布，通知用户不可修改' : '只有选中的用户能收到该公告'}
                      className="sm:col-span-2"
                    >
                      {() => (
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
                      )}
                    </field.CustomField>
                  )}
                </form.AppField>
              )}

              <form.AppField name="noticeMethods">
                {field => {
                  const selectedMethods = (field.state.value ?? []).map(String)
                  const methodLabels = methodOptions
                    .filter(option => selectedMethods.includes(option.value))
                    .map(option => option.label)
                    .join('、')

                  return (
                    <field.CustomField
                      label="通知方式"
                      description="可多选；不选则只保存公告，不推送消息"
                      className="sm:col-span-2"
                    >
                      {({ id }) => (
                        <Select
                          multiple
                          items={methodOptions}
                          value={selectedMethods}
                          disabled={isPublished}
                          onValueChange={values => field.handleChange(values.map(Number))}
                        >
                          <SelectTrigger id={id} className="w-full">
                            <SelectValue placeholder="请选择通知方式">
                              {() => methodLabels || '请选择通知方式'}
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
                      )}
                    </field.CustomField>
                  )
                }}
              </form.AppField>

              <form.AppField name="isTiming">
                {field => (
                  <field.SwitchInput
                    label="定时发布"
                    description={field.state.value ? '到达发布时间后自动发布' : '保存或发布时立即生效'}
                    checkedValue={true}
                    uncheckedValue={false}
                    disabled={isPublished}
                    className="sm:col-span-2"
                  />
                )}
              </form.AppField>

              {isTiming && (
                <form.AppField name="publishTime">
                  {field => (
                    <field.CustomField label="发布时间" required className="sm:col-span-2">
                      {({ invalid }) => (
                        <NoticePublishTimePicker
                          value={field.state.value}
                          disabled={isPublished}
                          invalid={invalid}
                          onChange={value => field.handleChange(value)}
                        />
                      )}
                    </field.CustomField>
                  )}
                </form.AppField>
              )}

              <form.AppField name="isTop">
                {field => (
                  <field.SwitchInput
                    label="置顶"
                    description="置顶公告在列表和通知中优先展示"
                    checkedValue={true}
                    uncheckedValue={false}
                    className="sm:col-span-2"
                  />
                )}
              </form.AppField>

              <form.AppField name="content">
                {field => (
                  <field.CustomField label="内容" required className="sm:col-span-2">
                    {({ invalid }) => (
                      <RichTextEditor
                        value={field.state.value}
                        invalid={invalid}
                        onChange={html => field.handleChange(html)}
                      />
                    )}
                  </field.CustomField>
                )}
              </form.AppField>
            </FieldGroup>
          </div>

          <DrawerFooter>
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
      ) : detailQuery.isError ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <QueryState state="error" className="p-6" onRetry={() => void detailQuery.refetch()} />
          <DrawerFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
          </DrawerFooter>
        </div>
      ) : (
        <NoticeFormSkeleton onClose={onClose} />
      )}

      <NoticeUserPicker
        open={userPickerOpen && !isPublished}
        selected={noticeUserIds}
        onClose={() => setUserPickerOpen(false)}
        onConfirm={ids => {
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
      <DrawerFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          取消
        </Button>
      </DrawerFooter>
    </div>
  )
}
