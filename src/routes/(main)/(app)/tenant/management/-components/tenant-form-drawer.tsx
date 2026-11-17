import * as React from 'react'

import { revalidateLogic } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { z } from 'zod'

import { Building2, PackageOpen } from 'lucide-react'

import { EntityDrawer } from '@/components/entity-drawer'
import { ExpiryPicker } from '@/components/expiry-picker'
import { FormItem, useAppForm } from '@/components/form'
import { FormSkeleton } from '@/components/form-skeleton'
import { QueryState } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { FieldGroup } from '@/components/ui/field'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { useFillFormOnce } from '@/hooks/use-fill-form-once'
import { listPackageDict, packageKeys } from '@/lib/api/package'
import { createTenant, tenantKeys, updateTenant, type TenantDetailResp, type TenantReq } from '@/lib/api/tenant'
import { encryptByRsa } from '@/lib/crypto'
import { PASSWORD_HINT, PASSWORD_PATTERN } from '@/lib/password'

import { useTenantDetail } from './use-tenant-detail'

/** Mirrors `RegexConstants.USERNAME`: 4-64 chars, letters, digits, underscore, letter first. */
const USERNAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{3,64}$/

const USERNAME_HINT = '管理员用户名长度为 4-64 个字符，支持字母、数字、下划线，且以字母开头'

const formSchema = z.object({
  name: z.string().trim().min(1, '请输入租户名称').max(30, '名称长度不能超过 30 个字符'),
  domain: z
    .string()
    .max(255, '域名长度不能超过 255 个字符')
    .refine(value => !value || (/^[^\s/?#]+$/.test(value) && !value.includes('://')), '请输入不含协议的域名或 IP'),
  expireTime: z.string().refine(value => {
    if (!value) {
      return true
    }

    const date = new Date(value.replace(/-/g, '/'))
    return !Number.isNaN(date.getTime()) && date.getTime() > Date.now()
  }, '过期时间必须是未来时间'),
  adminUsername: z.string().max(64, '管理员用户名长度不能超过 64 个字符'),
  adminPassword: z.string().max(32, '密码长度不能超过 32 个字符'),
  packageId: z.string(),
  description: z.string().max(200, '描述长度不能超过 200 个字符'),
  status: z.union([z.literal(1), z.literal(2)])
})

type FormValues = z.infer<typeof formSchema>

const EMPTY_FORM: FormValues = {
  name: '',
  domain: '',
  expireTime: '',
  adminUsername: '',
  adminPassword: '',
  packageId: '',
  description: '',
  status: 1
}

/** `packageId` becomes a string so it can drive the select. */
function toFormValues(tenant: TenantDetailResp): FormValues {
  return {
    name: tenant.name ?? '',
    domain: tenant.domain ?? '',
    expireTime: tenant.expireTime ?? '',
    adminUsername: tenant.adminUsername ?? '',
    // The backend never returns a stored password, so it stays empty and never reaches the body.
    adminPassword: '',
    packageId: tenant.packageId === null || tenant.packageId === undefined ? '' : String(tenant.packageId),
    description: tenant.description ?? '',
    status: tenant.status ?? 1
  }
}

interface TenantFormDrawerProps {
  /** The tenant being edited, or `null` to create one. */
  readonly tenantId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

/**
 * Create and edit form for one tenant.
 *
 * The field set and its order follow the Vue client's `AddModal.vue`: the administrator
 * fields and the package are only offered on create, while the package already attached
 * to an existing tenant is kept in the form so the required `packageId` still travels.
 */
export function TenantFormDrawer({ tenantId, open, onClose }: TenantFormDrawerProps) {
  const queryClient = useQueryClient()
  const isCreate = tenantId === null

  const detail = useTenantDetail(tenantId, { enabled: open })

  const packages = useQuery({
    queryKey: packageKeys.dicts(),
    queryFn: ({ signal }) => listPackageDict(signal),
    enabled: open
  })

  const packageOptions = React.useMemo(() => packages.data ?? [], [packages.data])
  const packageItems = React.useMemo(
    () => packageOptions.map(option => ({ value: String(option.value), label: option.label })),
    [packageOptions]
  )
  const packageIdByValue = React.useMemo(
    () => new Map(packageOptions.map(option => [String(option.value), option.value])),
    [packageOptions]
  )

  /** The body both modes send; only a create adds the administrator credentials. */
  const toTenantReq = (values: FormValues): TenantReq => ({
    name: values.name.trim(),
    domain: values.domain.trim() || undefined,
    expireTime: values.expireTime || null,
    description: values.description.trim() || undefined,
    status: values.status,
    packageId: packageIdByValue.get(values.packageId) ?? values.packageId
  })

  const form = useAppForm({
    defaultValues: EMPTY_FORM,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    onSubmit: async ({ value }) => {
      if (tenantId === null) {
        let password: string
        try {
          password = encryptByRsa(value.adminPassword)
        } catch {
          // Encryption happens locally, so the HTTP layer is not there to report it.
          toast.add({ title: '密码加密失败，请刷新页面后重试', type: 'error' })
          return
        }

        try {
          await createTenant({
            ...toTenantReq(value),
            adminUsername: value.adminUsername.trim(),
            adminPassword: password
          })

          onClose()
          void queryClient.invalidateQueries({ queryKey: tenantKeys.all })
          toast.add({ title: '新增成功', type: 'success' })
        } catch {
          // The HTTP layer already reported the failure.
        }

        return
      }

      try {
        await updateTenant(tenantId, toTenantReq(value))

        onClose()
        // One prefix covers both the list and the cached detail.
        void queryClient.invalidateQueries({ queryKey: tenantKeys.all })
        toast.add({ title: '修改成功', type: 'success' })
      } catch {
        // The HTTP layer already reported the failure.
      }
    }
  })

  useFillFormOnce({
    open,
    isEdit: !isCreate,
    entityKey: tenantId,
    record: detail.data,
    version: detail.dataUpdatedAt,
    buildValues: ({ isEdit: editing, record }) => (editing && record ? toFormValues(record) : EMPTY_FORM),
    apply: values => form.reset(values, { keepDefaultValues: true }),
    resetOnClose: false
  })

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      title={isCreate ? '新增租户' : '修改租户'}
      icon={<Building2 className="size-4" />}
      width={32}
      canClose={() => !form.state.isSubmitting}
    >
      {isCreate || (!detail.isError && detail.data && detail.fetchStatus === 'idle') ? (
        <form.AppForm>
          <form.FormShell footer={<form.FormFooter onCancel={onClose} />}>
            <FieldGroup className="gap-4">
              <form.AppField name="name" validators={{ onDynamic: formSchema.shape.name }}>
                {field => <field.TextInput label="名称" required maxLength={30} placeholder="请输入租户名称" />}
              </form.AppField>

              <form.AppField name="domain" validators={{ onDynamic: formSchema.shape.domain }}>
                {field => (
                  <field.TextInput
                    label="域名"
                    addonStart="http(s)://"
                    maxLength={255}
                    placeholder="请输入需要绑定的域名"
                  />
                )}
              </form.AppField>

              <form.AppField name="expireTime" validators={{ onDynamic: formSchema.shape.expireTime }}>
                {field => (
                  <field.CustomField
                    label="过期时间"
                    description="留空表示永不过期；若设置则必须是未来时间"
                    hideDescriptionOnError
                  >
                    {({ id, invalid }) => (
                      <ExpiryPicker
                        id={id}
                        value={field.state.value}
                        onChange={field.handleChange}
                        onBlur={field.handleBlur}
                        invalid={invalid}
                      />
                    )}
                  </field.CustomField>
                )}
              </form.AppField>

              {isCreate ? (
                <>
                  <form.AppField
                    name="adminUsername"
                    validators={{
                      onBlur: ({ value }) => (USERNAME_PATTERN.test(value) ? undefined : { message: USERNAME_HINT }),
                      onSubmit: ({ value }) => (USERNAME_PATTERN.test(value) ? undefined : { message: USERNAME_HINT })
                    }}
                  >
                    {field => (
                      <field.TextInput
                        label="管理员用户"
                        required
                        maxLength={64}
                        placeholder="请输入管理员用户"
                        autoComplete="off"
                      />
                    )}
                  </form.AppField>

                  <form.AppField
                    name="adminPassword"
                    validators={{
                      onBlur: ({ value }) => (PASSWORD_PATTERN.test(value) ? undefined : { message: PASSWORD_HINT }),
                      onSubmit: ({ value }) => (PASSWORD_PATTERN.test(value) ? undefined : { message: PASSWORD_HINT })
                    }}
                  >
                    {field => (
                      <field.PasswordInput
                        label="管理员密码"
                        required
                        description={PASSWORD_HINT}
                        hideDescriptionOnError
                        maxLength={32}
                        placeholder="请输入管理员密码"
                        autoComplete="new-password"
                      />
                    )}
                  </form.AppField>

                  <form.Field
                    name="packageId"
                    validators={{
                      onSubmit: ({ value }) => (value ? undefined : { message: '请选择套餐' })
                    }}
                  >
                    {field => {
                      const invalid = field.state.meta.errors.length > 0

                      return (
                        <FormItem
                          id="tenant-package"
                          label="套餐"
                          required
                          // The empty state replaces the error, since there is nothing to pick.
                          errors={packageOptions.length > 0 ? field.state.meta.errors : []}
                        >
                          {packages.isPending ? (
                            <Skeleton className="h-8 w-full" />
                          ) : packageOptions.length > 0 ? (
                            <Select
                              items={packageItems}
                              value={field.state.value}
                              onValueChange={value => field.handleChange(value ?? '')}
                            >
                              <SelectTrigger id="tenant-package" className="w-full" aria-invalid={invalid}>
                                <SelectValue placeholder="请选择套餐" />
                              </SelectTrigger>
                              <SelectContent alignItemWithTrigger={false}>
                                <SelectGroup>
                                  {packageItems.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Empty className="min-h-28 border border-dashed p-4">
                              <EmptyHeader>
                                <EmptyMedia>
                                  <PackageOpen />
                                </EmptyMedia>
                                <EmptyTitle>{packages.isError ? '套餐加载失败' : '暂无可用套餐'}</EmptyTitle>
                                <EmptyDescription>
                                  {packages.isError ? (
                                    '请关闭抽屉后重新打开重试'
                                  ) : (
                                    <>
                                      {'请先在「'}
                                      <Button
                                        nativeButton={false}
                                        variant="link"
                                        className="h-auto p-0 align-baseline text-sm font-normal"
                                        render={<Link to="/tenant/package" />}
                                      >
                                        套餐管理
                                      </Button>
                                      {'」中创建并启用套餐'}
                                    </>
                                  )}
                                </EmptyDescription>
                              </EmptyHeader>
                            </Empty>
                          )}
                        </FormItem>
                      )
                    }}
                  </form.Field>
                </>
              ) : null}

              <form.AppField name="description" validators={{ onDynamic: formSchema.shape.description }}>
                {field => <field.TextareaInput label="描述" maxLength={200} rows={3} placeholder="请输入描述" />}
              </form.AppField>

              <form.AppField name="status">
                {field => (
                  <field.SwitchInput
                    label="状态"
                    description={field.state.value === 1 ? '启用后该租户可以正常访问' : '禁用后该租户无法访问'}
                  />
                )}
              </form.AppField>
            </FieldGroup>
          </form.FormShell>
        </form.AppForm>
      ) : detail.isError ? (
        <QueryState state="error" className="p-6" onRetry={() => void detail.refetch()} />
      ) : (
        <FormSkeleton fields={['input', 'input', 'input', 'textarea', 'switch']} />
      )}
    </EntityDrawer>
  )
}
