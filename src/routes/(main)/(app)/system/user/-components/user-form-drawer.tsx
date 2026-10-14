import * as React from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { X } from 'lucide-react'

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
import { deptKeys, flattenDepts, getDeptTree } from '@/lib/api/dept'
import { listRoleDict, roleKeys } from '@/lib/api/role'
import {
  createUser,
  updateUser,
  userKeys,
  type UserDetailResp,
  type UserGender,
  type UserReq,
  type UserStatus
} from '@/lib/api/user'
import { encryptPassword } from '@/lib/crypto'

import { DeptTreeSelect } from './dept-tree-select'
import { genderLabel } from './user-display'
import { useUserDetail } from './use-user-detail'
import { UserRoleSelect } from './user-role-select'

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

/**
 * Mirrors `RegexConstants.PASSWORD`: 8 to 32 characters with at least one digit and one
 * lowercase letter. The profile and password-reset forms enforce the same rule. The backend does
 * not check it when an administrator creates an account, so this is the only thing keeping a new
 * account from being born weaker than one its owner could set for themselves.
 */
const PASSWORD_PATTERN = /^(?=.*\d)(?=.*[a-z]).{8,32}$/

/** Shown under the password field until the value breaks the rule. */
const PASSWORD_HINT = '密码长度为 8-32 个字符，且至少包含一个小写字母和一个数字'

/** Departments and roles barely change, so reopening the form should not refetch them. */
const LOOKUP_STALE_MS = 5 * 60_000

const GENDER_ITEMS = ([0, 1, 2] as const).map(value => ({ value: String(value), label: genderLabel(value) }))

const formSchema = z.object({
  nickname: z.string().regex(NAME_PATTERN, '昵称长度为 2-30 个字符，支持中文、字母、数字、下划线、短横线'),
  username: z.string().regex(USERNAME_PATTERN, '用户名长度为 4-64 个字符，支持大小写字母、数字、下划线，且以字母开头'),
  // A create requires it and an edit never renders the field, so the rule only has to tolerate the
  // empty value an edit carries. `onSubmit` rejects an empty one when creating.
  password: z.string().refine(value => value === '' || PASSWORD_PATTERN.test(value), PASSWORD_HINT),
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
  password: '',
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
    // The backend never returns a stored password, so it stays empty and never reaches the body.
    password: '',
    phone: user.phone ?? '',
    email: user.email ?? '',
    gender: user.gender ?? 1,
    deptId: user.deptId === null || user.deptId === undefined ? '' : String(user.deptId),
    roleIds: (user.roleIds ?? []).map(String),
    description: user.description ?? '',
    status: user.status ?? 1
  }
}

function UserFormSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-20 w-full" />
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

interface UserFormDrawerProps {
  /**
   * The user being edited, or `null` to create one.
   *
   * Unlike the detail drawer, `null` cannot mean "nothing picked yet": a create has to be able to
   * open the drawer, so `open` carries that state instead.
   */
  readonly userId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

/**
 * Create and edit form for one user, built like the detail drawer so they open the same way.
 *
 * One drawer covers both modes, the way the Vue client's `AddDrawer.vue` does. The field set and
 * its order follow that component; `password` is the one field it adds for a create, because the
 * backend only requires it in its create validation group.
 */
export function UserFormDrawer({ userId, open, onClose }: UserFormDrawerProps) {
  const queryClient = useQueryClient()
  const isCreate = userId === null

  // Shares its key with the detail drawer, so opening either one warms the other. A create has no
  // id, which leaves this query disabled.
  const detail = useUserDetail(userId)

  const depts = useQuery({
    queryKey: deptKeys.trees(),
    queryFn: getDeptTree,
    staleTime: LOOKUP_STALE_MS,
    enabled: open
  })

  const roles = useQuery({
    queryKey: roleKeys.dicts(),
    queryFn: listRoleDict,
    staleTime: LOOKUP_STALE_MS,
    enabled: open
  })

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: EMPTY_FORM })
  const isSubmitting = form.formState.isSubmitting
  const isSystemUser = !isCreate && Boolean(detail.data?.isSystem)
  const isSelfUser = !isCreate && Boolean(detail.data?.disabled && !detail.data?.isSystem)
  const isRoleDisabled = isSubmitting || isSystemUser || isSelfUser
  const isStatusDisabled = isSubmitting || isSystemUser || isSelfUser

  React.useEffect(() => {
    if (!open) {
      form.reset(EMPTY_FORM)
      return
    }

    if (isCreate) {
      form.reset({ ...EMPTY_FORM })
      return
    }

    if (detail.data) {
      form.reset(toFormValues(detail.data))
    }
  }, [open, isCreate, detail.data, form])

  const deptOptions = React.useMemo(() => flattenDepts(depts.data ?? []), [depts.data])
  // The pickers speak in strings; these maps give the original id back for the request body.
  const deptIdByValue = React.useMemo(() => new Map(deptOptions.map(dept => [String(dept.id), dept.id])), [deptOptions])
  const roleIdByValue = React.useMemo(
    () => new Map((roles.data ?? []).map(role => [String(role.value), role.value])),
    [roles.data]
  )

  /** The body both modes send; only a create adds a password to it. */
  const toUserReq = (values: FormValues): UserReq => ({
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

  const onSubmit = async (values: FormValues) => {
    if (userId === null) {
      if (!values.password) {
        form.setError('password', { message: '密码不能为空' })
        return
      }

      let password: string
      try {
        password = encryptPassword(values.password)
      } catch {
        // Encryption happens locally, so the HTTP layer is not there to report it.
        toast.add({ title: '密码加密失败，请刷新页面后重试', type: 'error' })
        return
      }

      try {
        await createUser({ ...toUserReq(values), password })

        onClose()
        void queryClient.invalidateQueries({ queryKey: userKeys.all })
        toast.add({ title: '新增成功', type: 'success' })
      } catch {
        // The HTTP layer already reported the failure.
      }

      return
    }

    try {
      await updateUser(userId, toUserReq(values))

      onClose()
      // One prefix covers both the list and the cached detail.
      void queryClient.invalidateQueries({ queryKey: userKeys.all })
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
          <DrawerTitle>{isCreate ? '新增用户' : '修改用户'}</DrawerTitle>
          <DrawerClose render={<Button variant="ghost" size="icon-sm" disabled={isSubmitting} />}>
            <X className="size-4" />
            <span className="sr-only">关闭</span>
          </DrawerClose>
        </DrawerHeader>

        {/* A create has nothing to load, so its form is ready the moment the drawer opens. */}
        {isCreate || detail.data ? (
          <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
              <FieldGroup className="gap-4">
                <Controller
                  control={form.control}
                  name="nickname"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel>昵称</FieldLabel>
                      <Input
                        {...field}
                        maxLength={30}
                        placeholder="请输入昵称"
                        disabled={isSubmitting}
                        aria-invalid={fieldState.invalid}
                      />
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
                        disabled={isSubmitting}
                        autoComplete="off"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                {isCreate ? (
                  <Controller
                    control={form.control}
                    name="password"
                    render={({ field, fieldState }) => (
                      <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="user-create-password">密码</FieldLabel>
                        <PasswordInput
                          {...field}
                          id="user-create-password"
                          maxLength={32}
                          placeholder="请输入密码"
                          disabled={isSubmitting}
                          autoComplete="new-password"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid ? (
                          <FieldError errors={[fieldState.error]} />
                        ) : (
                          <FieldDescription>{PASSWORD_HINT}</FieldDescription>
                        )}
                      </Field>
                    )}
                  />
                ) : null}

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
                        disabled={isSubmitting}
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
                        disabled={isSubmitting}
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
                        disabled={isSubmitting}
                        onValueChange={value => field.onChange(value ? Number(value) : field.value)}
                      >
                        <SelectTrigger className="w-full" disabled={isSubmitting} aria-invalid={fieldState.invalid}>
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
                      <DeptTreeSelect
                        data={depts.data}
                        loading={depts.isPending}
                        disabled={isSubmitting || depts.isPending || depts.isError}
                        value={field.value}
                        onChange={field.onChange}
                        invalid={fieldState.invalid}
                        enabled={open}
                      />
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
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel>角色</FieldLabel>
                      <UserRoleSelect
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isRoleDisabled}
                        invalid={fieldState.invalid}
                        enabled={open}
                      />
                      {(isSystemUser || isSelfUser) && (
                        <FieldDescription>
                          {isSystemUser ? '系统内置用户不允许修改角色' : '当前登录用户不允许修改自身角色'}
                        </FieldDescription>
                      )}
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
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
                        disabled={isSubmitting}
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
                          {isSystemUser
                            ? '系统内置用户不允许修改状态'
                            : isSelfUser
                              ? '当前登录用户不允许禁用自身账号'
                              : field.value === 1
                                ? '启用后该用户可以登录'
                                : '禁用后该用户无法登录'}
                        </FieldDescription>
                      </FieldContent>
                      <Switch
                        checked={field.value === 1}
                        onCheckedChange={checked => field.onChange(checked ? 1 : 2)}
                        disabled={isStatusDisabled}
                        aria-invalid={fieldState.invalid}
                      />
                    </Field>
                  )}
                />
              </FieldGroup>
            </div>

            <DrawerFooter className="flex-row justify-end gap-2 border-t p-4">
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
            </DrawerFooter>
          </form>
        ) : detail.isError ? (
          <p className="p-4 text-sm text-foreground">加载失败，请稍后重试</p>
        ) : (
          <UserFormSkeleton onClose={onClose} />
        )}
      </DrawerContent>
    </Drawer>
  )
}
