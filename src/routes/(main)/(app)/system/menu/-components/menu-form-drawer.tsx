import * as React from 'react'

import { revalidateLogic, useSelector } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { FileText, Folder, MousePointerClick } from 'lucide-react'

import { EntityDrawer } from '@/components/entity-drawer'
import { useAppForm } from '@/components/form'
import { ParentTreeSelect } from '@/components/parent-tree-select'
import { QueryState } from '@/components/query-state'
import { RequiredMark } from '@/components/required-mark'
import { FieldGroup } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { useFillFormOnce } from '@/hooks/use-fill-form-once'
import { createMenu, getMenu, menuKeys, type MenuReq, type MenuResp, updateMenu } from '@/lib/api/menu'
import { cn } from 'cn'

import { toMenuNodeData } from './menu-tree'

const IconPicker = React.lazy(() => import('./icon-picker').then(mod => ({ default: mod.IconPicker })))

const formSchema = z
  .object({
    type: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    title: z.string().min(1, '标题不能为空').max(30, '标题长度不能超过 30 个字符'),
    parentId: z.union([z.string(), z.number()]).nullable().optional(),
    icon: z.string().nullable().optional(),
    // `null` while cleared, instead of snapping back to 1.
    sort: z
      .number('请输入排序')
      .int('排序必须为整数')
      .min(1, '排序最小值为 1')
      .nullable()
      .refine(value => value !== null, '请输入排序'),
    status: z.union([z.literal(1), z.literal(2)]),
    path: z.string().max(255, '路由地址不能超过 255 个字符').optional().nullable(),
    name: z.string().max(50, '组件名称不能超过 50 个字符').optional().nullable(),
    component: z.string().max(255, '组件路径不能超过 255 个字符').optional().nullable(),
    redirect: z.string().max(255, '重定向地址不能超过 255 个字符').optional().nullable(),
    permission: z.string().max(100, '权限标识不能超过 100 个字符').optional().nullable(),
    isExternal: z.boolean(),
    isCache: z.boolean(),
    isHidden: z.boolean()
  })
  .superRefine((data, ctx) => {
    if (data.type === 2 && !data.path?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['path'],
        message: '菜单类型必须填写路由地址'
      })
    }

    if (data.isExternal && data.path && !/^https?:\/\//i.test(data.path)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['path'],
        message: '外链地址格式不正确，请以 http:// 或 https:// 开头'
      })
    }
  })

// The input type, so `sort` may hold `null` while cleared.
type FormValues = z.input<typeof formSchema>
type TextFieldName = 'path' | 'name' | 'component' | 'redirect' | 'permission'
type SwitchFieldName = 'isHidden' | 'isExternal' | 'isCache'

const DEFAULT_FORM_VALUES: FormValues = {
  type: 2,
  title: '',
  parentId: null,
  icon: null,
  sort: 1,
  status: 1,
  path: '',
  name: '',
  component: '',
  redirect: '',
  permission: '',
  isExternal: false,
  isCache: false,
  isHidden: false
}

/** Menu types keep their accent colour, while the radio dot carries the checked state on its own. */
const MENU_TYPE_OPTIONS = [
  {
    value: 1,
    label: '目录',
    icon: Folder,
    selectedClass: cn(
      'has-data-checked:border-sky-500/50 has-data-checked:bg-sky-500/10 has-data-checked:shadow-2xs',
      'has-data-checked:text-sky-700 dark:has-data-checked:text-sky-300'
    )
  },
  {
    value: 2,
    label: '菜单',
    icon: FileText,
    selectedClass: cn(
      'has-data-checked:border-emerald-500/50 has-data-checked:bg-emerald-500/10 has-data-checked:shadow-2xs',
      'has-data-checked:text-emerald-700 dark:has-data-checked:text-emerald-300'
    )
  },
  {
    value: 3,
    label: '按钮',
    icon: MousePointerClick,
    selectedClass: cn(
      'has-data-checked:border-purple-500/50 has-data-checked:bg-purple-500/10 has-data-checked:shadow-2xs',
      'has-data-checked:text-purple-700 dark:has-data-checked:text-purple-300'
    )
  }
] as const

interface MenuFormDrawerProps {
  readonly menuId: string | number | null
  readonly defaultParentId?: string | number | null
  readonly open: boolean
  readonly onClose: () => void
  readonly menuTree: MenuResp[]
}

export function MenuFormDrawer({ menuId, defaultParentId, open, onClose, menuTree }: MenuFormDrawerProps) {
  const queryClient = useQueryClient()
  const isEdit = Boolean(menuId)

  const form = useAppForm({
    defaultValues: DEFAULT_FORM_VALUES,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    onSubmit: async ({ value }) => {
      const payload: MenuReq = {
        type: value.type,
        title: value.title.trim(),
        parentId: value.parentId ? value.parentId : null,
        icon: value.type !== 3 ? value.icon || null : null,
        // The schema rejects `null`, so `sort` holds a number once submit runs.
        sort: value.sort as number,
        status: value.status,
        path: value.type !== 3 ? value.path?.trim() || null : null,
        name: value.type === 2 ? value.name?.trim() || null : null,
        component: value.type === 2 ? value.component?.trim() || null : null,
        redirect: value.type !== 3 ? value.redirect?.trim() || null : null,
        permission: value.type !== 1 ? value.permission?.trim() || null : null,
        isExternal: value.type !== 3 ? value.isExternal : false,
        isCache: value.type === 2 ? value.isCache : false,
        isHidden: value.type !== 3 ? value.isHidden : false
      }

      try {
        if (menuId === null) {
          await createMenu(payload)
        } else {
          await updateMenu(menuId, payload)
        }
      } catch {
        // The HTTP layer already reported the failure.
        return
      }

      toast.add({ title: isEdit ? '修改菜单成功' : '新增菜单成功', type: 'success' })
      void queryClient.invalidateQueries({ queryKey: menuKeys.trees() })
      onClose()
    }
  })

  // `form.state` is a render-time snapshot, so the values that pick which fields render, and the
  // "saving" flag that disables them, come from subscriptions.
  const menuType = useSelector(form.store, state => state.values.type)
  const isExternal = useSelector(form.store, state => state.values.isExternal)
  const isSubmitting = useSelector(form.store, state => state.isSubmitting)

  const {
    data: menuDetail,
    dataUpdatedAt: menuDetailUpdatedAt,
    isLoading: isLoadingDetail,
    isError: isDetailError,
    refetch: refetchDetail
  } = useQuery({
    queryKey: menuKeys.detail(menuId),
    queryFn: ({ signal }) => getMenu(menuId!, signal),
    enabled: open && isEdit
  })

  useFillFormOnce({
    open,
    isEdit,
    entityKey: menuId,
    record: menuDetail,
    version: menuDetailUpdatedAt,
    buildValues: ({ isEdit: editing, record }) =>
      editing && record
        ? {
            type: record.type,
            title: record.title,
            parentId: record.parentId ?? null,
            icon: record.icon ?? null,
            sort: record.sort,
            status: record.status,
            path: record.path ?? '',
            name: record.name ?? '',
            component: record.component ?? '',
            redirect: record.redirect ?? '',
            permission: record.permission ?? '',
            isExternal: Boolean(record.isExternal),
            isCache: Boolean(record.isCache),
            isHidden: Boolean(record.isHidden)
          }
        : { ...DEFAULT_FORM_VALUES, parentId: defaultParentId ?? null },
    apply: values => form.reset(values, { keepDefaultValues: true })
  })

  const renderTextField = (
    name: TextFieldName,
    label: React.ReactNode,
    options: { placeholder: string; description?: string }
  ) => (
    <form.AppField name={name} validators={{ onDynamic: formSchema.shape[name] }}>
      {field => (
        <field.TextInput
          label={label}
          description={options.description}
          placeholder={options.placeholder}
          disabled={isSubmitting}
        />
      )}
    </form.AppField>
  )

  const renderSwitchField = (name: SwitchFieldName, label: string, description: (checked: boolean) => string) => (
    <form.AppField name={name}>
      {field => (
        <field.SwitchInput
          label={label}
          description={description(field.state.value)}
          checkedValue={true}
          uncheckedValue={false}
          disabled={isSubmitting}
        />
      )}
    </form.AppField>
  )

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? '修改菜单' : '新增菜单'}
      width={32}
      closeDisabled={isSubmitting}
    >
      {isEdit && isLoadingDetail ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : isEdit && isDetailError ? (
        <QueryState state="error" className="p-6" onRetry={() => void refetchDetail()} />
      ) : (
        <form.AppForm>
          <form.FormShell footer={<form.FormFooter onCancel={onClose} />}>
            <FieldGroup className="gap-4">
              <form.AppField name="type">
                {field => {
                  const isTypeDisabled = isEdit || isSubmitting

                  return (
                    <field.CustomField
                      label="菜单类型"
                      description={isEdit ? '编辑菜单时不支持修改菜单类型' : undefined}
                    >
                      {() => (
                        <RadioGroup
                          value={String(field.state.value)}
                          onValueChange={value => field.handleChange(Number(value) as FormValues['type'])}
                          disabled={isTypeDisabled}
                          className="grid grid-cols-3 gap-2"
                        >
                          {MENU_TYPE_OPTIONS.map(option => (
                            <Label
                              key={option.value}
                              className={cn(
                                'flex w-full items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-colors',
                                'border-border/60 bg-muted/30 text-muted-foreground',
                                'has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50',
                                isTypeDisabled
                                  ? 'cursor-not-allowed opacity-50'
                                  : 'cursor-pointer hover:bg-muted/60 hover:text-foreground',
                                option.selectedClass
                              )}
                            >
                              <RadioGroupItem value={String(option.value)} className="absolute size-0 opacity-0" />
                              <option.icon className="size-4 shrink-0" />
                              <span>{option.label}</span>
                            </Label>
                          ))}
                        </RadioGroup>
                      )}
                    </field.CustomField>
                  )
                }}
              </form.AppField>

              <form.AppField name="parentId">
                {field => (
                  <field.CustomField label="上级菜单">
                    {({ id, invalid }) => (
                      <ParentTreeSelect
                        id={id}
                        value={field.state.value}
                        onChange={field.handleChange}
                        data={menuTree}
                        currentId={menuId}
                        toNodeData={toMenuNodeData}
                        disabled={isSubmitting}
                        invalid={invalid}
                        placeholder="选择上级菜单（默认根目录）"
                        searchPlaceholder="搜索上级菜单"
                        emptyText="未找到相关菜单"
                        allOptionLabel="根目录"
                      />
                    )}
                  </field.CustomField>
                )}
              </form.AppField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <form.AppField name="title" validators={{ onDynamic: formSchema.shape.title }}>
                  {field => (
                    <field.TextInput
                      label={menuType === 3 ? '按钮名称' : '菜单名称'}
                      required
                      placeholder={menuType === 3 ? '例如：新增' : '例如：用户管理'}
                      disabled={isSubmitting}
                    />
                  )}
                </form.AppField>

                <form.AppField name="sort" validators={{ onDynamic: formSchema.shape.sort }}>
                  {field => (
                    <field.NumberInput
                      label="排序"
                      required
                      min={1}
                      placeholder="数值越小越靠前"
                      disabled={isSubmitting}
                    />
                  )}
                </form.AppField>
              </div>

              {menuType !== 3 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {renderTextField('path', <>路由地址{menuType === 2 && <RequiredMark />}</>, {
                    placeholder: isExternal ? 'https://example.com' : '/system/user',
                    description: isExternal
                      ? '外部网页完整链接，以 http:// 或 https:// 开头'
                      : '访问的前端路由路径，以 / 开头'
                  })}

                  <form.AppField name="icon">
                    {field => (
                      <field.CustomField label="菜单图标">
                        {() => (
                          <React.Suspense fallback={<Skeleton className="h-9 w-full" />}>
                            <IconPicker
                              value={field.state.value}
                              onChange={field.handleChange}
                              disabled={isSubmitting}
                            />
                          </React.Suspense>
                        )}
                      </field.CustomField>
                    )}
                  </form.AppField>
                </div>
              )}

              {menuType === 3 &&
                renderTextField('permission', '权限标识', {
                  placeholder: '请输入权限标识',
                  description: '接口鉴权代码'
                })}

              {menuType === 2 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {renderTextField('name', '组件名称', { placeholder: '请输入组件名称' })}
                  {renderTextField('component', '组件路径', { placeholder: '请输入组件路径' })}
                  {renderTextField('permission', '权限标识', { placeholder: '请输入权限标识' })}
                  {renderTextField('redirect', '重定向地址', { placeholder: '请输入重定向地址' })}
                </div>
              )}

              {menuType === 1 && renderTextField('redirect', '重定向地址', { placeholder: '请输入重定向地址' })}

              <form.AppField name="status">
                {field => (
                  <field.SwitchInput
                    label="菜单状态"
                    description={
                      field.state.value === 1
                        ? '启用状态，正常在系统导航与权限中生效'
                        : '禁用状态，该菜单及按钮将不可用'
                    }
                    disabled={isSubmitting}
                  />
                )}
              </form.AppField>

              {menuType !== 3 &&
                renderSwitchField('isHidden', '隐藏菜单', hidden =>
                  hidden ? '已隐藏，不会在侧边栏导航中展示' : '正常在侧边栏导航中展示'
                )}

              {menuType !== 3 &&
                renderSwitchField('isExternal', '是否外链', external =>
                  external ? '开启后点击将通过新标签页打开外部链接' : '内部前端路由页面'
                )}

              {menuType === 2 &&
                renderSwitchField('isCache', '是否缓存', cache =>
                  cache ? '开启 KeepAlive 缓存，切换路由时保持页面状态' : '不缓存页面'
                )}
            </FieldGroup>
          </form.FormShell>
        </form.AppForm>
      )}
    </EntityDrawer>
  )
}
