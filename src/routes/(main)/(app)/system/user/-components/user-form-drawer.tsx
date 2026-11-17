import * as React from 'react'

import { revalidateLogic } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { Pen, User2 } from 'lucide-react'

import { DeptTreeSelect } from '@/components/dept-tree-select'
import { EntityDrawer } from '@/components/entity-drawer'
import { useAppForm } from '@/components/form'
import { FormSkeleton } from '@/components/form-skeleton'
import { QueryState } from '@/components/query-state'
import { FieldGroup } from '@/components/ui/field'
import { toast } from '@/components/ui/toast'
import { useFillFormOnce } from '@/hooks/use-fill-form-once'
import { deptKeys, getDeptTree } from '@/lib/api/dept'
import {
  createUser,
  updateUser,
  userKeys,
  type UserDetailResp,
  type UserReq,
  type UserStatus
} from '@/lib/api/user'
import { encryptByRsa } from '@/lib/crypto'
import { PASSWORD_HINT, PASSWORD_PATTERN } from '@/lib/password'

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

const GENDER_ITEMS = ([0, 1, 2] as const).map(value => ({ value, label: genderLabel(value) }))

const baseSchema = z.object({
  nickname: z.string().regex(NAME_PATTERN, '昵称长度为 2-30 个字符，支持中文、字母、数字、下划线、短横线'),
  username: z.string().regex(USERNAME_PATTERN, '用户名长度为 4-64 个字符，支持大小写字母、数字、下划线，且以字母开头'),
  // Filled only when creating; `createSchema` adds the non-empty rule.
  password: z.string(),
  phone: z.string().refine(value => value === '' || PHONE_PATTERN.test(value), '手机号格式不正确'),
  email: z
    .string()
    .max(255, '邮箱长度不能超过 255 个字符')
    .refine(value => value === '' || EMAIL_PATTERN.test(value), '邮箱格式不正确'),
  gender: z.literal([0, 1, 2]),
  deptId: z.string().min(1, '请选择所属部门'),
  roleIds: z.array(z.string()).min(1, '请至少选择一个角色'),
  description: z.string().max(200, '描述长度不能超过 200 个字符'),
  status: z.number().int().min(1).max(2)
})

/** Creating a user requires a password; editing never sends one, so the field stays optional. */
const createSchema = baseSchema.extend({
  password: z.string().min(1, '密码不能为空').regex(PASSWORD_PATTERN, PASSWORD_HINT)
})

type FormValues = z.infer<typeof baseSchema>

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
    nickname: user.nickname,
    username: user.username,
    // The backend never returns a stored password, so it stays empty and never reaches the body.
    password: '',
    phone: user.phone ?? '',
    email: user.email ?? '',
    gender: user.gender,
    deptId: user.deptId === null ? '' : String(user.deptId),
    roleIds: user.roleIds.map(String),
    description: user.description ?? '',
    status: user.status
  }
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
  const isCreate = userId === null

  // A new schema object on every render would re-register the validators, so it is tied to the mode.
  const validationSchema = React.useMemo(() => (isCreate ? createSchema : baseSchema), [isCreate])

  // Shares its key with the detail drawer, so opening either one warms the other. Fetching on open
  // matters more here than there: the form submits every field, so a stale base would overwrite
  // whatever another admin saved in the meantime.
  const detail = useUserDetail(userId, { enabled: open })

  const depts = useQuery({
    queryKey: deptKeys.trees(),
    queryFn: ({ signal }) => getDeptTree(undefined, signal),
    enabled: open
  })

  const toUserReq = (values: FormValues): UserReq => ({
    nickname: values.nickname.trim(),
    username: values.username.trim(),
    gender: values.gender,
    deptId: values.deptId,
    roleIds: values.roleIds,
    status: values.status as UserStatus,
    // Trim empty strings to undefined so they are omitted from JSON, preventing unique
    // index constraint violations on MySQL (which allows multiple NULLs but only one '').
    email: values.email.trim() || undefined,
    phone: values.phone.trim() || undefined,
    description: values.description.trim() || undefined
  })

  const finish = (message: string) => {
    onClose()
    // One prefix covers both the list and the cached detail.
    void queryClient.invalidateQueries({ queryKey: userKeys.all })
    toast.add({ title: message, type: 'success' })
  }

  const form = useAppForm({
    defaultValues: EMPTY_FORM,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: validationSchema },
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

  useFillFormOnce({
    open,
    isEdit: !isCreate,
    entityKey: userId,
    record: detail.data,
    version: detail.dataUpdatedAt,
    buildValues: ({ isEdit: editing, record }) => (editing && record ? toFormValues(record) : { ...EMPTY_FORM }),
    apply: values => form.reset(values, { keepDefaultValues: true })
  })

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
        <form.AppForm>
          <form.FormShell footer={<form.FormFooter onCancel={onClose} />}>
            <FieldGroup>
              <form.AppField name="nickname">
                {field => (
                  <field.TextInput
                    label="昵称"
                    required
                    maxLength={30}
                    placeholder="请输入昵称"
                  />
                )}
              </form.AppField>

              <form.AppField name="username">
                {field => (
                  <field.TextInput
                    label="用户名"
                    required
                    maxLength={64}
                    placeholder="请输入用户名"
                    autoComplete="off"
                  />
                )}
              </form.AppField>

              {isCreate ? (
                <form.AppField name="password">
                  {field => (
                    <field.PasswordInput
                      label="密码"
                      required
                      description={PASSWORD_HINT}
                      hideDescriptionOnError
                      maxLength={32}
                      placeholder="请输入密码"
                      autoComplete="new-password"
                    />
                  )}
                </form.AppField>
              ) : null}

              <form.AppField name="phone">
                {field => (
                  <field.TextInput
                    label="手机号码"
                    type="tel"
                    maxLength={14}
                    placeholder="请输入手机号码"
                    autoComplete="off"
                  />
                )}
              </form.AppField>

              <form.AppField name="email">
                {field => (
                  <field.TextInput
                    label="邮箱"
                    type="email"
                    maxLength={255}
                    placeholder="请输入邮箱地址"
                    autoComplete="off"
                  />
                )}
              </form.AppField>

              <form.AppField name="gender">
                {field => <field.SelectInput label="性别" options={GENDER_ITEMS} />}
              </form.AppField>

              <form.AppField name="deptId">
                {field => (
                  <field.CustomField label="所属部门" required>
                    {({ id, invalid }) => (
                      <>
                        <DeptTreeSelect
                          id={id}
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
                      </>
                    )}
                  </field.CustomField>
                )}
              </form.AppField>

              <form.AppField name="roleIds">
                {field => (
                  <field.CustomField label="角色" required>
                    {({ id, invalid }) => (
                      <UserRoleSelect
                        id={id}
                        value={field.state.value}
                        onChange={field.handleChange}
                        invalid={invalid}
                        enabled={open}
                      />
                    )}
                  </field.CustomField>
                )}
              </form.AppField>

              <form.AppField name="description">
                {field => <field.TextareaInput label="描述" rows={3} maxLength={200} placeholder="请输入描述信息" />}
              </form.AppField>

              <form.AppField name="status">
                {field => (
                  <field.SwitchInput
                    label="状态"
                    description={field.state.value === 1 ? '启用后该用户可以登录' : '禁用后该用户无法登录'}
                  />
                )}
              </form.AppField>
            </FieldGroup>
          </form.FormShell>
        </form.AppForm>
      ) : detail.isError ? (
        <QueryState state="error" className="p-6" onRetry={() => void detail.refetch()} />
      ) : (
        <FormSkeleton
          fields={['input', 'input', 'input', 'input', 'input', 'input', 'input', 'textarea', 'switch']}
          onCancel={onClose}
        />
      )}
    </EntityDrawer>
  )
}
