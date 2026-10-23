import * as React from 'react'

import { revalidateLogic, useForm } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { Pen, User2 } from 'lucide-react'

import { EntityDrawer } from '@/components/entity-drawer'
import { PasswordInput } from '@/components/password-input'
import { QueryState } from '@/components/query-state'
import { RequiredMark } from '@/components/required-mark'
import { Button } from '@/components/ui/button'
import { DrawerFooter } from '@/components/ui/drawer'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
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
import { encryptByRsa } from '@/lib/crypto'

import { DeptTreeSelect } from './dept-tree-select'
import { genderLabel } from './user-display'
import { useUserDetail } from './use-user-detail'
import { UserRoleSelect } from './user-role-select'

/** Mirrors the backend username rule: 4-64 chars, letter first, letters/digits/underscore. */
const USERNAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{3,64}$/

/** Mirrors the backend name rule: 2-30 CJK/letters/digits/`_`/`-`. */
const NAME_PATTERN = /^[\u4e00-\u9fa5a-zA-Z0-9_-]{2,30}$/

/** Mirrors Hutool's `RegexPool.MOBILE`, which the backend's `@Mobile` also uses. */
const PHONE_PATTERN = /^(?:0|86|\+86)?1[3-9]\d{9}$/

/** The backend's `@Email` accepts single-label domains, so only reject malformed input. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/

/** Mirrors the backend password policy enforced by the profile and reset flows. */
const PASSWORD_PATTERN = /^(?=.*\d)(?=.*[a-z]).{8,32}$/

/** Shown under the password field until the value breaks the rule. */
const PASSWORD_HINT = '密码长度为 8-32 个字符，且至少包含一个小写字母和一个数字'

/** Departments and roles barely change, so reopening the form should not refetch them. */
const LOOKUP_STALE_MS = 5 * 60_000

const GENDER_ITEMS = ([0, 1, 2] as const).map(value => ({ value: String(value), label: genderLabel(value) }))

const formSchema = z.object({
  nickname: z.string().regex(NAME_PATTERN, '昵称长度为 2-30 个字符，支持中文、字母、数字、下划线、短横线'),
  username: z.string().regex(USERNAME_PATTERN, '用户名长度为 4-64 个字符，支持大小写字母、数字、下划线，且以字母开头'),
  // Edits carry an empty value; the create-only rule below rejects an empty password.
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

type TextFieldName = 'nickname' | 'username' | 'phone' | 'email'

/** Whether the schema rejects an empty value, which is what the marker tells the user. */
const isRequired = (field: keyof FormValues) => !formSchema.shape[field].safeParse('').success

/** Create-only password rule; edit mode carries an empty value but never renders the field. */
const createPasswordRule = z.string().min(1, '密码不能为空').regex(PASSWORD_PATTERN, PASSWORD_HINT)

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
 * Create/edit form for one user; only create mode renders the password field.
 */
export function UserFormDrawer({ userId, open, onClose }: UserFormDrawerProps) {
  const queryClient = useQueryClient()
  const formRef = React.useRef<HTMLFormElement>(null)
  const isCreate = userId === null

  // Shares its key with the detail drawer, so opening either one warms the other. Fetching on open
  // matters more here than there: the form submits every field, so a stale base would overwrite
  // whatever another admin saved in the meantime.
  const detail = useUserDetail(userId, { enabled: open, refreshOnOpen: !isCreate })

  const depts = useQuery({
    queryKey: deptKeys.trees(),
    queryFn: ({ signal }) => getDeptTree(undefined, signal),
    staleTime: LOOKUP_STALE_MS,
    enabled: open
  })

  const roles = useQuery({
    queryKey: roleKeys.dicts(),
    queryFn: ({ signal }) => listRoleDict(signal),
    staleTime: LOOKUP_STALE_MS,
    enabled: open
  })

  const deptOptions = React.useMemo(() => flattenDepts(depts.data ?? []), [depts.data])
  // The pickers speak in strings; these maps give the original id back for the request body.
  const deptIdByValue = React.useMemo(() => new Map(deptOptions.map(dept => [String(dept.id), dept.id])), [deptOptions])
  const roleIdByValue = React.useMemo(
    () => new Map((roles.data ?? []).map(role => [String(role.value), role.value])),
    [roles.data]
  )

  /** The body both modes send; only a create adds a password to it. */
  const toUserReq = (values: FormValues): UserReq => ({
    nickname: values.nickname.trim(),
    username: values.username.trim(),
    gender: values.gender as UserGender,
    deptId: deptIdByValue.get(values.deptId) ?? values.deptId,
    roleIds: values.roleIds.map(value => roleIdByValue.get(value) ?? value),
    status: values.status as UserStatus,
    // Trim empty strings to undefined so they are omitted from JSON, preventing unique
    // index constraint violations on MySQL (which allows multiple NULLs but only one '').
    email: values.email?.trim() || undefined,
    phone: values.phone?.trim() || undefined,
    description: values.description?.trim() || undefined
  })

  const finish = (message: string) => {
    onClose()
    // One prefix covers both the list and the cached detail.
    void queryClient.invalidateQueries({ queryKey: userKeys.all })
    toast.add({ title: message, type: 'success' })
  }

  const form = useForm({
    defaultValues: EMPTY_FORM,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    onSubmit: async ({ value }) => {
      if (userId === null) {
        let password: string
        try {
          password = encryptByRsa(value.password)
        } catch {
          // Encryption happens locally, so the HTTP layer is not there to report it.
          toast.add({ title: '密码加密失败，请刷新页面后重试', type: 'error' })
          return
        }

        try {
          await createUser({ ...toUserReq(value), password })

          finish('新增成功')
        } catch {
          // The HTTP layer already reported the failure.
        }

        return
      }

      try {
        await updateUser(userId, toUserReq(value))

        finish('修改成功')
      } catch {
        // The HTTP layer already reported the failure.
      }
    }
  })

  /** Run the object validator first; handleSubmit stops at field errors and would hide form-level ones. */
  const submit = async () => {
    await form.validate('submit')
    await form.handleSubmit()

    // TanStack Form does not move focus to the first invalid control, so the drawer does it here.
    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    })
  }

  const renderTextField = (
    name: TextFieldName,
    label: string,
    input: { maxLength: number; placeholder: string; autoComplete?: string }
  ) => (
    <form.Field name={name} validators={{ onDynamic: formSchema.shape[name] }}>
      {field => {
        const invalid = field.state.meta.errors.length > 0

        return (
          <Field data-invalid={invalid}>
            <FieldLabel>
              {label}
              {isRequired(name) && <RequiredMark />}
            </FieldLabel>
            <Input
              name={name}
              value={field.state.value}
              onChange={event => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              autoComplete={input.autoComplete}
              maxLength={input.maxLength}
              placeholder={input.placeholder}
              aria-invalid={invalid}
            />
            <FieldError errors={field.state.meta.errors} />
          </Field>
        )
      }}
    </form.Field>
  )

  // Fill the form once per open, and only after the record has settled (see the render guard below).
  // React Query hands back a fresh object on every successful fetch, so without both the gate and
  // this guard a slow refetch would land on top of what the user has already typed.
  //
  // `keepDefaultValues` is load-bearing: `reset(values)` otherwise rewrites the form's own
  // defaultValues, and the next render's `update(opts)` reads that as "defaults changed" and puts
  // `EMPTY_FORM` back into the fields.
  const filledForRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!open) {
      form.reset({ ...EMPTY_FORM }, { keepDefaultValues: true })
      filledForRef.current = null
      return
    }

    if (isCreate) {
      form.reset({ ...EMPTY_FORM }, { keepDefaultValues: true })
      return
    }

    if (!detail.data) return

    const key = String(userId)
    if (filledForRef.current === `${key}:${detail.dataUpdatedAt}`) return
    filledForRef.current = `${key}:${detail.dataUpdatedAt}`
    form.reset(toFormValues(detail.data), { keepDefaultValues: true })
  }, [open, isCreate, userId, detail.data, detail.dataUpdatedAt, form])

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      title={isCreate ? '新增用户' : '修改用户'}
      icon={isCreate ? <User2 className="size-4" /> : <Pen className="size-4" />}
      width={32}
      canClose={() => !form.state.isSubmitting}
    >
      {/* A create has nothing to load, so its form is ready the moment the drawer opens. An edit
            waits for the record to settle, so the form never renders on a stale base. */}
      {isCreate || (!detail.isError && detail.data && detail.fetchStatus === 'idle') ? (
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
            <FieldGroup>
              {renderTextField('nickname', '昵称', { maxLength: 30, placeholder: '请输入昵称' })}

              {renderTextField('username', '用户名', {
                maxLength: 64,
                placeholder: '请输入用户名',
                autoComplete: 'off'
              })}

              {isCreate ? (
                <form.Field name="password" validators={{ onDynamic: createPasswordRule }}>
                  {field => {
                    const invalid = field.state.meta.errors.length > 0

                    return (
                      <Field data-invalid={invalid}>
                        <FieldLabel htmlFor="user-create-password">
                          密码
                          <RequiredMark />
                        </FieldLabel>
                        <PasswordInput
                          name="password"
                          id="user-create-password"
                          value={field.state.value}
                          onChange={event => field.handleChange(event.target.value)}
                          onBlur={field.handleBlur}
                          maxLength={32}
                          placeholder="请输入密码"
                          autoComplete="new-password"
                          aria-invalid={invalid}
                        />
                        {invalid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : (
                          <FieldDescription>{PASSWORD_HINT}</FieldDescription>
                        )}
                      </Field>
                    )
                  }}
                </form.Field>
              ) : null}

              {renderTextField('phone', '手机号码', {
                maxLength: 14,
                placeholder: '请输入手机号码',
                autoComplete: 'off'
              })}

              {renderTextField('email', '邮箱', {
                maxLength: 255,
                placeholder: '请输入邮箱地址',
                autoComplete: 'off'
              })}

              <form.Field name="gender" validators={{ onDynamic: formSchema.shape.gender }}>
                {field => {
                  const invalid = field.state.meta.errors.length > 0

                  return (
                    <Field data-invalid={invalid}>
                      <FieldLabel>性别</FieldLabel>
                      <Select
                        items={GENDER_ITEMS}
                        value={String(field.state.value)}
                        onValueChange={value => field.handleChange(value ? Number(value) : field.state.value)}
                      >
                        <SelectTrigger className="w-full" aria-invalid={invalid}>
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
                      <FieldError errors={field.state.meta.errors} />
                    </Field>
                  )
                }}
              </form.Field>

              <form.Field name="deptId" validators={{ onDynamic: formSchema.shape.deptId }}>
                {field => {
                  const invalid = field.state.meta.errors.length > 0

                  return (
                    <Field data-invalid={invalid}>
                      <FieldLabel>所属部门{isRequired('deptId') && <RequiredMark />}</FieldLabel>
                      <DeptTreeSelect
                        data={depts.data}
                        loading={depts.isPending}
                        disabled={depts.isPending || depts.isError}
                        value={field.state.value}
                        onChange={field.handleChange}
                        invalid={invalid}
                        enabled={open}
                      />
                      {depts.isError && (
                        <QueryState
                          state="error"
                          title="部门加载失败"
                          onRetry={() => void depts.refetch()}
                          className="p-2"
                        />
                      )}
                      <FieldError errors={field.state.meta.errors} />
                    </Field>
                  )
                }}
              </form.Field>

              <form.Field name="roleIds" validators={{ onDynamic: formSchema.shape.roleIds }}>
                {field => {
                  const invalid = field.state.meta.errors.length > 0

                  return (
                    <Field data-invalid={invalid}>
                      <FieldLabel>角色{isRequired('roleIds') && <RequiredMark />}</FieldLabel>
                      <UserRoleSelect
                        value={field.state.value}
                        onChange={field.handleChange}
                        invalid={invalid}
                        enabled={open}
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </Field>
                  )
                }}
              </form.Field>

              <form.Field name="description" validators={{ onDynamic: formSchema.shape.description }}>
                {field => {
                  const invalid = field.state.meta.errors.length > 0

                  return (
                    <Field data-invalid={invalid}>
                      <FieldLabel>描述</FieldLabel>
                      <Textarea
                        name="description"
                        value={field.state.value}
                        onChange={event => field.handleChange(event.target.value)}
                        onBlur={field.handleBlur}
                        rows={3}
                        maxLength={200}
                        placeholder="请输入描述信息"
                        aria-invalid={invalid}
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </Field>
                  )
                }}
              </form.Field>

              <form.Field name="status" validators={{ onDynamic: formSchema.shape.status }}>
                {field => {
                  const invalid = field.state.meta.errors.length > 0

                  return (
                    <Field orientation="horizontal" data-invalid={invalid}>
                      <FieldContent>
                        <FieldLabel>状态</FieldLabel>
                        <FieldDescription>
                          {field.state.value === 1 ? '启用后该用户可以登录' : '禁用后该用户无法登录'}
                        </FieldDescription>
                      </FieldContent>
                      <Switch
                        checked={field.state.value === 1}
                        onCheckedChange={checked => field.handleChange(checked ? 1 : 2)}
                        aria-invalid={invalid}
                      />
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
                </>
              )}
            </form.Subscribe>
          </DrawerFooter>
        </form>
      ) : detail.isError ? (
        <QueryState state="error" className="p-6" onRetry={() => void detail.refetch()} />
      ) : (
        <UserFormSkeleton onClose={onClose} />
      )}
    </EntityDrawer>
  )
}
