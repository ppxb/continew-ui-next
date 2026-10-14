import * as React from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { ChevronDown, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { flattenDepts, getDeptTree } from '@/lib/api/dept'
import { listRoles } from '@/lib/api/role'
import { updateUser, type UserDetailResp, type UserGender, type UserStatus } from '@/lib/api/user'

import { genderLabel } from './user-display'
import { useUserDetail } from './use-user-detail'

/** Mirrors `RegexConstants.USERNAME`: 4-64 chars, letters, digits, underscore, letter first. */
const USERNAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{3,64}$/

/** Mirrors `RegexConstants.GENERAL_NAME`: 2-30 chars of CJK, letters, digits, `_` or `-`. */
const NAME_PATTERN = /^[\u4e00-\u9fa5a-zA-Z0-9_-]{2,30}$/

/**
 * Mirrors Hutool's `RegexPool.MOBILE`, which is what the backend's `@Mobile` matches with.
 *
 * Copying it exactly, rather than writing a looser rule, is what keeps the client from
 * rejecting a number the server would accept.
 */
const PHONE_PATTERN = /^(?:0|86|\+86)?1[3-9]\d{9}$/

/**
 * Only rejects obviously malformed addresses.
 *
 * The backend uses Hibernate Validator's `@Email`, which accepts single-label domains such
 * as `user@localhost`, so requiring a dot here would block input the server takes.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/

/** Departments and roles barely change, so reopening the form should not refetch them. */
const LOOKUP_STALE_MS = 5 * 60_000

const GENDER_ITEMS = ([0, 1, 2] as const).map(value => ({ value: String(value), label: genderLabel(value) }))

const formSchema = z.object({
  nickname: z.string().regex(NAME_PATTERN, '昵称长度为 2-30 个字符，支持中文、字母、数字、下划线、短横线'),
  username: z.string().regex(USERNAME_PATTERN, '用户名长度为 4-64 个字符，支持大小写字母、数字、下划线，且以字母开头'),
  phone: z.string().refine(value => value === '' || PHONE_PATTERN.test(value), '手机号格式不正确'),
  email: z
    .string()
    .max(255, '邮箱长度不能超过 255 个字符')
    .refine(value => value === '' || EMAIL_PATTERN.test(value), '邮箱格式不正确'),
  gender: z.number().int().min(0).max(2),
  deptId: z.string().min(1, '请选择所属部门'),
  roleIds: z.array(z.string()).min(1, '请至少选择一个角色'),
  description: z.string().max(200, '描述长度不能超过 200 个字符'),
  status: z.number().int().min(1).max(2)
})

type FormValues = z.infer<typeof formSchema>

const EMPTY_FORM: FormValues = {
  nickname: '',
  username: '',
  phone: '',
  email: '',
  gender: 1,
  deptId: '',
  roleIds: [],
  description: '',
  status: 1
}

/** `deptId` and `roleIds` become strings so they can drive the pickers. */
function toFormValues(user: UserDetailResp): FormValues {
  return {
    nickname: user.nickname ?? '',
    username: user.username ?? '',
    phone: user.phone ?? '',
    email: user.email ?? '',
    gender: user.gender ?? 1,
    deptId: user.deptId === null || user.deptId === undefined ? '' : String(user.deptId),
    roleIds: (user.roleIds ?? []).map(String),
    description: user.description ?? '',
    status: user.status ?? 1
  }
}

interface UserEditDrawerProps {
  /** The user being edited, or `null` before the first one is picked. */
  readonly userId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

/**
 * Edit form for one user, built like the detail drawer so both open the same way.
 *
 * The field set and its order follow the Vue client's `AddDrawer.vue`; its create-only
 * fields are left out because the backend only requires a password when creating.
 */
export function UserEditDrawer({ userId, open, onClose }: UserEditDrawerProps) {
  const queryClient = useQueryClient()

  // Shares its key with the detail drawer, so opening either one warms the other.
  const detail = useUserDetail(userId)

  const depts = useQuery({
    queryKey: ['system', 'dept', 'tree'],
    queryFn: getDeptTree,
    staleTime: LOOKUP_STALE_MS,
    enabled: open
  })

  const roles = useQuery({
    queryKey: ['system', 'role', 'list'],
    queryFn: listRoles,
    staleTime: LOOKUP_STALE_MS,
    enabled: open
  })

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: EMPTY_FORM })

  React.useEffect(() => {
    if (open && detail.data) {
      form.reset(toFormValues(detail.data))
    }
  }, [open, detail.data, form])

  const deptOptions = React.useMemo(() => flattenDepts(depts.data ?? []), [depts.data])
  const deptItems = React.useMemo(
    () => deptOptions.map(dept => ({ value: String(dept.id), label: dept.name })),
    [deptOptions]
  )
  // The pickers speak in strings; these maps give the original id back for the request body.
  const deptIdByValue = React.useMemo(() => new Map(deptOptions.map(dept => [String(dept.id), dept.id])), [deptOptions])
  const roleIdByValue = React.useMemo(
    () => new Map((roles.data ?? []).map(role => [String(role.id), role.id])),
    [roles.data]
  )

  const onSubmit = async (values: FormValues) => {
    if (userId === null) {
      return
    }

    try {
      await updateUser(userId, {
        nickname: values.nickname,
        username: values.username,
        gender: values.gender as UserGender,
        deptId: deptIdByValue.get(values.deptId) ?? values.deptId,
        roleIds: values.roleIds.map(value => roleIdByValue.get(value) ?? value),
        status: values.status as UserStatus,
        // Empty strings, not `undefined`: MyBatis-Plus defaults to `updateStrategy = NOT_NULL`,
        // so an omitted field never reaches the SET clause and clearing it would silently do
        // nothing while the toast still claimed success. The backend accepts `''` for all three.
        email: values.email,
        phone: values.phone,
        description: values.description
      })

      onClose()
      // One prefix covers both the list and the cached detail.
      void queryClient.invalidateQueries({ queryKey: ['system', 'user'] })
      toast.add({ title: '修改成功', type: 'success' })
    } catch {
      // The HTTP layer already reported the failure.
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={nextOpen => {
        // Closing mid-save would leave the request in flight with no way to report it.
        if (!nextOpen && !form.formState.isSubmitting) {
          onClose()
        }
      }}
      swipeDirection="right"
    >
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:32rem]">
        <DrawerHeader className="flex-row items-start justify-between gap-2 border-b p-4 md:gap-2">
          <DrawerTitle>修改用户</DrawerTitle>
          <DrawerClose render={<Button variant="ghost" size="icon-sm" />}>
            <X className="size-4" />
            <span className="sr-only">关闭</span>
          </DrawerClose>
        </DrawerHeader>

        {detail.isPending ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner />
          </div>
        ) : detail.isError || !detail.data ? (
          <p className="p-4 text-sm text-foreground">加载失败，请稍后重试</p>
        ) : (
          <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
              <FieldGroup className="gap-4">
                <Controller
                  control={form.control}
                  name="nickname"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel>昵称</FieldLabel>
                      <Input {...field} maxLength={30} placeholder="请输入昵称" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="username"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel>用户名</FieldLabel>
                      <Input
                        {...field}
                        maxLength={64}
                        placeholder="请输入用户名"
                        autoComplete="off"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="phone"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel>手机号码</FieldLabel>
                      <Input
                        {...field}
                        maxLength={14}
                        placeholder="选填"
                        autoComplete="off"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel>邮箱</FieldLabel>
                      <Input
                        {...field}
                        maxLength={255}
                        placeholder="选填"
                        autoComplete="off"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="gender"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel>性别</FieldLabel>
                      <Select
                        items={GENDER_ITEMS}
                        value={String(field.value)}
                        onValueChange={value => field.onChange(value ? Number(value) : field.value)}
                      >
                        <SelectTrigger className="w-full" aria-invalid={fieldState.invalid}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="start" alignItemWithTrigger={false}>
                          <SelectGroup>
                            {GENDER_ITEMS.map(item => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="deptId"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel>所属部门</FieldLabel>
                      <Select
                        items={deptItems}
                        value={field.value}
                        onValueChange={value => field.onChange(value ?? '')}
                        disabled={depts.isPending || depts.isError}
                      >
                        <SelectTrigger className="w-full" aria-invalid={fieldState.invalid}>
                          <SelectValue placeholder={depts.isPending ? '加载中…' : '请选择所属部门'} />
                        </SelectTrigger>
                        <SelectContent align="start" alignItemWithTrigger={false}>
                          <SelectGroup>
                            {deptOptions.map(dept => (
                              // `label` only feeds keyboard type-ahead, so the indentation below
                              // does not break matching the way the rendered text would.
                              <SelectItem key={String(dept.id)} value={String(dept.id)} label={dept.name}>
                                {/* Indentation stands in for the tree the project has no component for. */}
                                {`${'\u00a0\u00a0'.repeat(dept.depth)}${dept.name}`}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {depts.isError && (
                        <p className="text-xs text-destructive">
                          部门加载失败，
                          <button type="button" className="underline" onClick={() => void depts.refetch()}>
                            重试
                          </button>
                        </p>
                      )}
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="roleIds"
                  render={({ field, fieldState }) => {
                    // Read from the field instead of `form.watch`, which the React Compiler
                    // lint rejects as an API that cannot be memoized safely.
                    const selectedRoleNames = (roles.data ?? [])
                      .filter(role => field.value.includes(String(role.id)))
                      .map(role => role.name)

                    return (
                      <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                        <FieldLabel>角色</FieldLabel>
                        <Popover>
                          <PopoverTrigger
                            render={
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-between font-normal"
                                aria-invalid={fieldState.invalid}
                              />
                            }
                          >
                            <span className={selectedRoleNames.length ? 'truncate' : 'truncate text-muted-foreground'}>
                              {roles.isPending
                                ? '加载中…'
                                : roles.isError
                                  ? '角色加载失败'
                                  : selectedRoleNames.length
                                    ? selectedRoleNames.join('、')
                                    : '请选择角色'}
                            </span>
                            <ChevronDown className="size-4 opacity-60" />
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-64 gap-0 p-1">
                            {roles.isError ? (
                              <p className="px-2 py-1.5 text-sm text-destructive">
                                角色加载失败，
                                <button type="button" className="underline" onClick={() => void roles.refetch()}>
                                  重试
                                </button>
                              </p>
                            ) : (roles.data ?? []).length === 0 ? (
                              <p className="px-2 py-1.5 text-sm text-muted-foreground">暂无可选角色</p>
                            ) : (
                              (roles.data ?? []).map(role => {
                                const value = String(role.id)
                                const checked = field.value.includes(value)

                                return (
                                  <div
                                    key={value}
                                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={next =>
                                        field.onChange(
                                          next ? [...field.value, value] : field.value.filter(item => item !== value)
                                        )
                                      }
                                    />
                                    <span className="flex-1 text-sm">{role.name}</span>
                                  </div>
                                )
                              })
                            )}
                          </PopoverContent>
                        </Popover>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )
                  }}
                />

                <Controller
                  control={form.control}
                  name="description"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel>描述</FieldLabel>
                      <Textarea
                        {...field}
                        rows={3}
                        maxLength={200}
                        placeholder="选填"
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
                    <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                      <FieldContent>
                        <FieldLabel>状态</FieldLabel>
                        <FieldDescription>
                          {field.value === 1 ? '启用后该用户可以登录' : '禁用后该用户无法登录'}
                        </FieldDescription>
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
