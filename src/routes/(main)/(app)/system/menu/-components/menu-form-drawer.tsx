import * as React from 'react'

import { revalidateLogic, useForm, useSelector } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { FileText, Folder, MousePointerClick, X } from 'lucide-react'

import { RequiredMark } from '@/components/required-mark'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import { createMenu, getMenu, menuKeys, type MenuReq, type MenuResp, updateMenu } from '@/lib/api/menu'
import { cn } from 'cn'

import { MenuParentSelect } from './menu-parent-select'

const IconPicker = React.lazy(() =>
  import('./icon-picker').then(mod => ({ default: mod.IconPicker }))
)

const formSchema = z
  .object({
    type: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    title: z.string().min(1, '标题不能为空').max(30, '标题长度不能超过 30 个字符'),
    parentId: z.union([z.string(), z.number()]).nullable().optional(),
    icon: z.string().nullable().optional(),
    sort: z.number().int().min(1, '排序最小值为 1'),
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
    // 菜单类型必须填写路由地址
    if (data.type === 2) {
      if (!data.path || !data.path.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['path'],
          message: '菜单类型必须填写路由地址'
        })
      }
    }

    if (data.isExternal && data.path && !/^https?:\/\//i.test(data.path)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['path'],
        message: '外链地址格式不正确，请以 http:// 或 https:// 开头'
      })
    }
  })

type FormValues = z.infer<typeof formSchema>

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
  const formRef = React.useRef<HTMLFormElement>(null)

  const form = useForm({
    defaultValues: DEFAULT_FORM_VALUES,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    onSubmit: async ({ value }) => {
      const payload: MenuReq = {
        type: value.type,
        title: value.title.trim(),
        parentId: value.parentId ? value.parentId : null,
        icon: value.type !== 3 ? value.icon || null : null,
        sort: value.sort,
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

  // Fetch menu details when editing
  const { data: menuDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: menuKeys.detail(menuId),
    queryFn: () => getMenu(menuId!),
    enabled: open && isEdit
  })

  // Fill the form once per open, and only after the record has settled. `keepDefaultValues` is
  // load-bearing: `reset(values)` otherwise rewrites the form's own defaults, and the next render's
  // `update(opts)` reads that as "defaults changed" and puts `DEFAULT_FORM_VALUES` back into the fields.
  const filledForRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!open) {
      form.reset({ ...DEFAULT_FORM_VALUES }, { keepDefaultValues: true })
      filledForRef.current = null
      return
    }

    if (!isEdit) {
      if (filledForRef.current === 'create') return
      filledForRef.current = 'create'
      form.reset({ ...DEFAULT_FORM_VALUES, parentId: defaultParentId ?? null }, { keepDefaultValues: true })
      return
    }

    if (!menuDetail) return

    // Keyed by id alone: a refetch of the same record must not reset what the user is editing.
    const key = String(menuId)
    if (filledForRef.current === key) return
    filledForRef.current = key

    form.reset(
      {
        type: menuDetail.type,
        title: menuDetail.title,
        parentId: menuDetail.parentId ?? null,
        icon: menuDetail.icon ?? null,
        sort: menuDetail.sort,
        status: menuDetail.status,
        path: menuDetail.path ?? '',
        name: menuDetail.name ?? '',
        component: menuDetail.component ?? '',
        redirect: menuDetail.redirect ?? '',
        permission: menuDetail.permission ?? '',
        isExternal: Boolean(menuDetail.isExternal),
        isCache: Boolean(menuDetail.isCache),
        isHidden: Boolean(menuDetail.isHidden)
      },
      { keepDefaultValues: true }
    )
  }, [open, isEdit, menuId, menuDetail, defaultParentId, form])

  /**
   * Validates the whole object before submitting: `handleSubmit` returns as soon as the field
   * validators report an invalid form, so the route-path rule that only sits on the form would stay
   * hidden until the other errors were fixed.
   */
  const submit = async () => {
    await form.validate('submit')
    await form.handleSubmit()

    // TanStack Form does not move focus to the first invalid control, so the drawer does it here.
    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    })
  }

  return (
    <Drawer
      open={open}
      onOpenChange={val => {
        // Closing mid-save would leave the request in flight with no way to report it.
        if (!val && !isSubmitting) {
          onClose()
        }
      }}
      swipeDirection="right"
    >
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:32rem]">
        <DrawerHeader className="flex-row items-center justify-between gap-2 border-b p-4 md:gap-2">
          <DrawerTitle className="text-base font-semibold">{isEdit ? '修改菜单' : '新增菜单'}</DrawerTitle>
          <DrawerClose render={<Button variant="ghost" size="icon-sm" disabled={isSubmitting} />}>
            <X className="size-4" />
            <span className="sr-only">关闭</span>
          </DrawerClose>
        </DrawerHeader>

        {isEdit && isLoadingDetail ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
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
                {/* Type Switcher (Disabled in Edit Mode) */}
                <form.Field name="type">
                  {field => {
                    const isTypeDisabled = isEdit || isSubmitting

                    return (
                      <Field className="gap-1.5">
                        <FieldLabel>菜单类型</FieldLabel>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            disabled={isTypeDisabled}
                            onClick={() => !isTypeDisabled && field.handleChange(1)}
                            className={cn(
                              'flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-colors',
                              field.state.value === 1
                                ? cn(
                                    'border-sky-500/50 bg-sky-500/10 text-sky-700 shadow-2xs dark:text-sky-300',
                                    isTypeDisabled && 'opacity-60'
                                  )
                                : isTypeDisabled
                                  ? 'border-border/40 bg-muted/20 text-muted-foreground/40 opacity-50'
                                  : 'border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                              isTypeDisabled && 'pointer-events-none'
                            )}
                          >
                            <Folder className="size-4 shrink-0" />
                            <span>目录</span>
                          </button>

                          <button
                            type="button"
                            disabled={isTypeDisabled}
                            onClick={() => !isTypeDisabled && field.handleChange(2)}
                            className={cn(
                              'flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-colors',
                              field.state.value === 2
                                ? cn(
                                    'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 shadow-2xs dark:text-emerald-300',
                                    isTypeDisabled && 'opacity-60'
                                  )
                                : isTypeDisabled
                                  ? 'border-border/40 bg-muted/20 text-muted-foreground/40 opacity-50'
                                  : 'border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                              isTypeDisabled && 'pointer-events-none'
                            )}
                          >
                            <FileText className="size-4 shrink-0" />
                            <span>菜单</span>
                          </button>

                          <button
                            type="button"
                            disabled={isTypeDisabled}
                            onClick={() => !isTypeDisabled && field.handleChange(3)}
                            className={cn(
                              'flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-colors',
                              field.state.value === 3
                                ? cn(
                                    'border-purple-500/50 bg-purple-500/10 text-purple-700 shadow-2xs dark:text-purple-300',
                                    isTypeDisabled && 'opacity-60'
                                  )
                                : isTypeDisabled
                                  ? 'border-border/40 bg-muted/20 text-muted-foreground/40 opacity-50'
                                  : 'border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                              isTypeDisabled && 'pointer-events-none'
                            )}
                          >
                            <MousePointerClick className="size-4 shrink-0" />
                            <span>按钮</span>
                          </button>
                        </div>
                        {isEdit && (
                          <FieldDescription className="text-muted-foreground">
                            编辑菜单时不支持修改菜单类型
                          </FieldDescription>
                        )}
                      </Field>
                    )
                  }}
                </form.Field>

                {/* Parent Menu */}
                <form.Field name="parentId">
                  {field => {
                    const invalid = field.state.meta.errors.length > 0

                    return (
                      <Field className="gap-1.5" data-invalid={invalid}>
                        <FieldLabel>上级菜单</FieldLabel>
                        <MenuParentSelect
                          value={field.state.value}
                          onChange={field.handleChange}
                          menuTree={menuTree}
                          currentMenuId={menuId}
                          disabled={isSubmitting}
                          invalid={invalid}
                        />
                        <FieldError errors={field.state.meta.errors} />
                      </Field>
                    )
                  }}
                </form.Field>

                {/* Required Fields Upfront: Title & Sort (2 columns on PC) */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <form.Field name="title" validators={{ onDynamic: formSchema.shape.title }}>
                    {field => {
                      const invalid = field.state.meta.errors.length > 0

                      return (
                        <Field className="gap-1.5" data-invalid={invalid}>
                          <FieldLabel htmlFor="menu-title">
                            {menuType === 3 ? '按钮名称' : '菜单名称'}
                            <RequiredMark />
                          </FieldLabel>
                          <Input
                            id="menu-title"
                            name="title"
                            value={field.state.value}
                            onChange={event => field.handleChange(event.target.value)}
                            onBlur={field.handleBlur}
                            placeholder={menuType === 3 ? '例如：新增' : '例如：用户管理'}
                            disabled={isSubmitting}
                            aria-invalid={invalid}
                          />
                          <FieldError errors={field.state.meta.errors} />
                        </Field>
                      )
                    }}
                  </form.Field>

                  <form.Field name="sort" validators={{ onDynamic: formSchema.shape.sort }}>
                    {field => {
                      const invalid = field.state.meta.errors.length > 0

                      return (
                        <Field className="gap-1.5" data-invalid={invalid}>
                          <FieldLabel htmlFor="menu-sort">
                            排序
                            <RequiredMark />
                          </FieldLabel>
                          <Input
                            id="menu-sort"
                            name="sort"
                            type="number"
                            min={1}
                            value={field.state.value}
                            onChange={event => field.handleChange(event.target.valueAsNumber || 1)}
                            onBlur={field.handleBlur}
                            placeholder="数值越小越靠前"
                            disabled={isSubmitting}
                            aria-invalid={invalid}
                          />
                          <FieldError errors={field.state.meta.errors} />
                        </Field>
                      )
                    }}
                  </form.Field>
                </div>

                {/* Route Path & Menu Icon on the same row on PC (DIR & MENU) */}
                {menuType !== 3 && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <form.Field name="path" validators={{ onDynamic: formSchema.shape.path }}>
                      {field => {
                        const invalid = field.state.meta.errors.length > 0

                        return (
                          <Field className="gap-1.5" data-invalid={invalid}>
                            <FieldLabel htmlFor="menu-path">
                              路由地址
                              {menuType === 2 && <RequiredMark />}
                            </FieldLabel>
                            <Input
                              id="menu-path"
                              name="path"
                              value={field.state.value ?? ''}
                              onChange={event => field.handleChange(event.target.value)}
                              onBlur={field.handleBlur}
                              placeholder={isExternal ? 'https://example.com' : '/system/user'}
                              disabled={isSubmitting}
                              aria-invalid={invalid}
                            />
                            <FieldDescription>
                              {isExternal ? '外部网页完整链接，以 http:// 或 https:// 开头' : '访问的前端路由路径，以 / 开头'}
                            </FieldDescription>
                            <FieldError errors={field.state.meta.errors} />
                          </Field>
                        )
                      }}
                    </form.Field>

                    <form.Field name="icon">
                      {field => (
                        <Field className="gap-1.5">
                          <FieldLabel>菜单图标</FieldLabel>
                          <React.Suspense fallback={<Skeleton className="h-9 w-full" />}>
                            <IconPicker
                              value={field.state.value}
                              onChange={field.handleChange}
                              disabled={isSubmitting}
                            />
                          </React.Suspense>
                        </Field>
                      )}
                    </form.Field>
                  </div>
                )}

                {/* Button specific: Permission code */}
                {menuType === 3 && (
                  <form.Field name="permission" validators={{ onDynamic: formSchema.shape.permission }}>
                    {field => (
                      <Field className="gap-1.5">
                        <FieldLabel htmlFor="menu-permission">权限标识</FieldLabel>
                        <Input
                          id="menu-permission"
                          name="permission"
                          value={field.state.value ?? ''}
                          onChange={event => field.handleChange(event.target.value)}
                          onBlur={field.handleBlur}
                          placeholder="例如：system:user:create"
                          disabled={isSubmitting}
                        />
                        <FieldDescription>接口鉴权代码</FieldDescription>
                      </Field>
                    )}
                  </form.Field>
                )}

                {/* Menu specific fields: Name & Component (2 columns on PC) */}
                {menuType === 2 && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <form.Field name="name" validators={{ onDynamic: formSchema.shape.name }}>
                      {field => (
                        <Field className="gap-1.5">
                          <FieldLabel htmlFor="menu-name">组件名称</FieldLabel>
                          <Input
                            id="menu-name"
                            name="name"
                            value={field.state.value ?? ''}
                            onChange={event => field.handleChange(event.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="例如：SystemUser"
                            disabled={isSubmitting}
                          />
                        </Field>
                      )}
                    </form.Field>

                    <form.Field name="component" validators={{ onDynamic: formSchema.shape.component }}>
                      {field => (
                        <Field className="gap-1.5">
                          <FieldLabel htmlFor="menu-component">组件路径</FieldLabel>
                          <Input
                            id="menu-component"
                            name="component"
                            value={field.state.value ?? ''}
                            onChange={event => field.handleChange(event.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="例如：system/user/index"
                            disabled={isSubmitting}
                          />
                        </Field>
                      )}
                    </form.Field>
                  </div>
                )}

                {/* Menu specific fields: Permission & Redirect (2 columns on PC) */}
                {menuType === 2 && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <form.Field name="permission" validators={{ onDynamic: formSchema.shape.permission }}>
                      {field => (
                        <Field className="gap-1.5">
                          <FieldLabel htmlFor="menu-permission">权限标识</FieldLabel>
                          <Input
                            id="menu-permission"
                            name="permission"
                            value={field.state.value ?? ''}
                            onChange={event => field.handleChange(event.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="例如：system:user:list（选填）"
                            disabled={isSubmitting}
                          />
                        </Field>
                      )}
                    </form.Field>

                    <form.Field name="redirect" validators={{ onDynamic: formSchema.shape.redirect }}>
                      {field => (
                        <Field className="gap-1.5">
                          <FieldLabel htmlFor="menu-redirect">重定向地址</FieldLabel>
                          <Input
                            id="menu-redirect"
                            name="redirect"
                            value={field.state.value ?? ''}
                            onChange={event => field.handleChange(event.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="例如：/system/user（选填）"
                            disabled={isSubmitting}
                          />
                        </Field>
                      )}
                    </form.Field>
                  </div>
                )}

                {/* Directory specific field: Redirect address */}
                {menuType === 1 && (
                  <form.Field name="redirect" validators={{ onDynamic: formSchema.shape.redirect }}>
                    {field => (
                      <Field className="gap-1.5">
                        <FieldLabel htmlFor="menu-redirect">重定向地址</FieldLabel>
                        <Input
                          id="menu-redirect"
                          name="redirect"
                          value={field.state.value ?? ''}
                          onChange={event => field.handleChange(event.target.value)}
                          onBlur={field.handleBlur}
                          placeholder="例如：/system/user（选填）"
                          disabled={isSubmitting}
                        />
                      </Field>
                    )}
                  </form.Field>
                )}

                {/* Switches - One per line, no card wrapper */}
                <form.Field name="status">
                  {field => (
                    <Field orientation="horizontal" className="items-center justify-between">
                      <FieldContent>
                        <FieldLabel>菜单状态</FieldLabel>
                        <FieldDescription>
                          {field.state.value === 1 ? '启用状态，正常在系统导航与权限中生效' : '禁用状态，该菜单及按钮将不可用'}
                        </FieldDescription>
                      </FieldContent>
                      <Switch
                        checked={field.state.value === 1}
                        onCheckedChange={checked => field.handleChange(checked ? 1 : 2)}
                        disabled={isSubmitting}
                      />
                    </Field>
                  )}
                </form.Field>

                {menuType !== 3 && (
                  <form.Field name="isHidden">
                    {field => (
                      <Field orientation="horizontal" className="items-center justify-between">
                        <FieldContent>
                          <FieldLabel>隐藏菜单</FieldLabel>
                          <FieldDescription>
                            {field.state.value ? '已隐藏，不会在侧边栏导航中展示' : '正常在侧边栏导航中展示'}
                          </FieldDescription>
                        </FieldContent>
                        <Switch
                          checked={field.state.value}
                          onCheckedChange={field.handleChange}
                          disabled={isSubmitting}
                        />
                      </Field>
                    )}
                  </form.Field>
                )}

                {menuType !== 3 && (
                  <form.Field name="isExternal">
                    {field => (
                      <Field orientation="horizontal" className="items-center justify-between">
                        <FieldContent>
                          <FieldLabel>是否外链</FieldLabel>
                          <FieldDescription>
                            {field.state.value ? '开启后点击将通过新标签页打开外部链接' : '内部前端路由页面'}
                          </FieldDescription>
                        </FieldContent>
                        <Switch
                          checked={field.state.value}
                          onCheckedChange={field.handleChange}
                          disabled={isSubmitting}
                        />
                      </Field>
                    )}
                  </form.Field>
                )}

                {menuType === 2 && (
                  <form.Field name="isCache">
                    {field => (
                      <Field orientation="horizontal" className="items-center justify-between">
                        <FieldContent>
                          <FieldLabel>是否缓存</FieldLabel>
                          <FieldDescription>
                            {field.state.value ? '开启 KeepAlive 缓存，切换路由时保持页面状态' : '不缓存页面'}
                          </FieldDescription>
                        </FieldContent>
                        <Switch
                          checked={field.state.value}
                          onCheckedChange={field.handleChange}
                          disabled={isSubmitting}
                        />
                      </Field>
                    )}
                  </form.Field>
                )}
              </FieldGroup>
            </div>

            <DrawerFooter className="flex-row justify-end gap-2 border-t p-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Spinner className="mr-1.5 size-3.5" />
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
