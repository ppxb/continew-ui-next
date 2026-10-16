import * as React from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { FileText, Folder, MousePointerClick, X } from 'lucide-react'

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

import { IconPicker } from './icon-picker'
import { MenuParentSelect } from './menu-parent-select'

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
    // 菜单必须填写路由地址（非外链需以 / 开头）
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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_FORM_VALUES
  })

  const currentType = useWatch({ control: form.control, name: 'type' })
  const isExternal = useWatch({ control: form.control, name: 'isExternal' })

  // Fetch menu details when editing
  const { data: menuDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: menuKeys.detail(menuId),
    queryFn: () => getMenu(menuId!),
    enabled: open && isEdit
  })

  // Synchronize form values on open/change
  React.useEffect(() => {
    if (!open) {
      form.reset(DEFAULT_FORM_VALUES)
      return
    }

    if (isEdit && menuDetail) {
      form.reset({
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
      })
    } else if (!isEdit) {
      form.reset({
        ...DEFAULT_FORM_VALUES,
        parentId: defaultParentId ?? null
      })
    }
  }, [open, isEdit, menuDetail, defaultParentId, form])

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: MenuReq = {
        type: values.type,
        title: values.title.trim(),
        parentId: values.parentId ? values.parentId : null,
        icon: values.type !== 3 ? values.icon || null : null,
        sort: values.sort,
        status: values.status,
        path: values.type !== 3 ? values.path?.trim() || null : null,
        name: values.type === 2 ? values.name?.trim() || null : null,
        component: values.type === 2 ? values.component?.trim() || null : null,
        redirect: values.type !== 3 ? values.redirect?.trim() || null : null,
        permission: values.type !== 1 ? values.permission?.trim() || null : null,
        isExternal: values.type !== 3 ? values.isExternal : false,
        isCache: values.type === 2 ? values.isCache : false,
        isHidden: values.type !== 3 ? values.isHidden : false
      }

      if (isEdit && menuId) {
        await updateMenu(menuId, payload)
      } else {
        await createMenu(payload)
      }
    },
    onSuccess: () => {
      toast.add({
        title: isEdit ? '菜单更新成功' : '菜单创建成功',
        type: 'success'
      })
      void queryClient.invalidateQueries({ queryKey: menuKeys.trees() })
      onClose()
    },
    onError: error => {
      toast.add({
        title: error instanceof Error ? error.message : '提交失败，请重试',
        type: 'error'
      })
    }
  })

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values)
  }

  return (
    <Drawer
      open={open}
      onOpenChange={val => {
        if (!val && !mutation.isPending) {
          onClose()
        }
      }}
      swipeDirection="right"
    >
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:34rem]">
        <DrawerHeader className="flex-row items-center justify-between gap-2 border-b p-4 md:gap-2">
          <DrawerTitle className="text-base font-semibold">{isEdit ? '修改菜单' : '新增菜单'}</DrawerTitle>
          <DrawerClose render={<Button variant="ghost" size="icon-sm" disabled={mutation.isPending} />}>
            <X className="size-4" />
            <span className="sr-only">关闭</span>
          </DrawerClose>
        </DrawerHeader>

        {isEdit && isLoadingDetail ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
            <FieldGroup className="gap-5">
              {/* Type Switcher */}
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Field className="gap-1.5">
                    <FieldLabel>菜单类型</FieldLabel>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => field.onChange(1)}
                        className={cn(
                          'flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-colors',
                          field.value === 1
                            ? 'border-sky-500/50 bg-sky-500/10 text-sky-700 shadow-2xs dark:text-sky-300'
                            : 'border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                        )}
                      >
                        <Folder className="size-4 shrink-0" />
                        <span>目录</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => field.onChange(2)}
                        className={cn(
                          'flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-colors',
                          field.value === 2
                            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 shadow-2xs dark:text-emerald-300'
                            : 'border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                        )}
                      >
                        <FileText className="size-4 shrink-0" />
                        <span>菜单</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => field.onChange(3)}
                        className={cn(
                          'flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-colors',
                          field.value === 3
                            ? 'border-purple-500/50 bg-purple-500/10 text-purple-700 shadow-2xs dark:text-purple-300'
                            : 'border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                        )}
                      >
                        <MousePointerClick className="size-4 shrink-0" />
                        <span>按钮</span>
                      </button>
                    </div>
                  </Field>
                )}
              />

              {/* Parent Menu */}
              <Controller
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <Field className="gap-1.5">
                    <FieldLabel>上级菜单</FieldLabel>
                    <MenuParentSelect
                      value={field.value}
                      onChange={field.onChange}
                      menuTree={menuTree}
                      currentMenuId={menuId}
                      disabled={mutation.isPending}
                    />
                    <FieldDescription>可选择所属父级目录或页面，若不选择默认为顶级根节点</FieldDescription>
                  </Field>
                )}
              />

              {/* Title & Icon row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  control={form.control}
                  name="title"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="menu-title">
                        {currentType === 3 ? '按钮名称' : '菜单标题'}
                        <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        {...field}
                        id="menu-title"
                        placeholder={currentType === 3 ? '例如：新增' : '例如：用户管理'}
                        disabled={mutation.isPending}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                {currentType !== 3 && (
                  <Controller
                    control={form.control}
                    name="icon"
                    render={({ field }) => (
                      <Field className="gap-1.5">
                        <FieldLabel>菜单图标</FieldLabel>
                        <IconPicker value={field.value} onChange={field.onChange} disabled={mutation.isPending} />
                      </Field>
                    )}
                  />
                )}
              </div>

              {/* Sort Order */}
              <Controller
                control={form.control}
                name="sort"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="menu-sort">
                      排序序号
                      <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="menu-sort"
                      type="number"
                      min={1}
                      value={field.value}
                      onChange={e => field.onChange(e.target.valueAsNumber || 1)}
                      placeholder="数值越小越靠前"
                      disabled={mutation.isPending}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              {/* Route Path (DIR & MENU) */}
              {currentType !== 3 && (
                <Controller
                  control={form.control}
                  name="path"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="menu-path">
                        路由地址
                        {currentType === 2 && <span className="text-destructive">*</span>}
                      </FieldLabel>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        id="menu-path"
                        placeholder={isExternal ? 'https://example.com' : '/system/user'}
                        disabled={mutation.isPending}
                      />
                      <FieldDescription>
                        {isExternal
                          ? '外部网页完整链接，以 http:// 或 https:// 开头'
                          : '访问的内部前端路由路径，以 / 开头'}
                      </FieldDescription>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              )}

              {/* Menu specific fields: Name, Component, Permission, Redirect */}
              {currentType === 2 && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Controller
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <Field className="gap-1.5">
                          <FieldLabel htmlFor="menu-name">组件名称</FieldLabel>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            id="menu-name"
                            placeholder="例如：SystemUser"
                            disabled={mutation.isPending}
                          />
                        </Field>
                      )}
                    />

                    <Controller
                      control={form.control}
                      name="component"
                      render={({ field }) => (
                        <Field className="gap-1.5">
                          <FieldLabel htmlFor="menu-component">组件路径</FieldLabel>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            id="menu-component"
                            placeholder="例如：system/user/index"
                            disabled={mutation.isPending}
                          />
                        </Field>
                      )}
                    />
                  </div>

                  <Controller
                    control={form.control}
                    name="redirect"
                    render={({ field }) => (
                      <Field className="gap-1.5">
                        <FieldLabel htmlFor="menu-redirect">重定向地址</FieldLabel>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          id="menu-redirect"
                          placeholder="例如：/system/user"
                          disabled={mutation.isPending}
                        />
                      </Field>
                    )}
                  />
                </>
              )}

              {/* Permission code (MENU & BUTTON) */}
              {currentType !== 1 && (
                <Controller
                  control={form.control}
                  name="permission"
                  render={({ field }) => (
                    <Field className="gap-1.5">
                      <FieldLabel htmlFor="menu-permission">
                        权限标识
                        {currentType === 3 && (
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">（对应接口鉴权代码）</span>
                        )}
                      </FieldLabel>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        id="menu-permission"
                        placeholder="例如：system:user:create"
                        disabled={mutation.isPending}
                      />
                    </Field>
                  )}
                />
              )}

              {/* Toggle Switches */}
              <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                <span className="text-xs font-medium text-foreground">状态与开关控制</span>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Controller
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <Field orientation="horizontal" className="items-center justify-between">
                        <FieldContent>
                          <FieldLabel className="text-xs font-normal">菜单状态</FieldLabel>
                          <FieldDescription className="text-[11px]">启用后在侧边栏显示</FieldDescription>
                        </FieldContent>
                        <Switch
                          checked={field.value === 1}
                          onCheckedChange={checked => field.onChange(checked ? 1 : 2)}
                          disabled={mutation.isPending}
                        />
                      </Field>
                    )}
                  />

                  {currentType !== 3 && (
                    <Controller
                      control={form.control}
                      name="isHidden"
                      render={({ field }) => (
                        <Field orientation="horizontal" className="items-center justify-between">
                          <FieldContent>
                            <FieldLabel className="text-xs font-normal">隐藏菜单</FieldLabel>
                            <FieldDescription className="text-[11px]">不显示在侧边栏菜单中</FieldDescription>
                          </FieldContent>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={mutation.isPending}
                          />
                        </Field>
                      )}
                    />
                  )}

                  {currentType !== 3 && (
                    <Controller
                      control={form.control}
                      name="isExternal"
                      render={({ field }) => (
                        <Field orientation="horizontal" className="items-center justify-between">
                          <FieldContent>
                            <FieldLabel className="text-xs font-normal">是否外链</FieldLabel>
                            <FieldDescription className="text-[11px]">点击后新标签页打开网页</FieldDescription>
                          </FieldContent>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={mutation.isPending}
                          />
                        </Field>
                      )}
                    />
                  )}

                  {currentType === 2 && (
                    <Controller
                      control={form.control}
                      name="isCache"
                      render={({ field }) => (
                        <Field orientation="horizontal" className="items-center justify-between">
                          <FieldContent>
                            <FieldLabel className="text-xs font-normal">是否缓存</FieldLabel>
                            <FieldDescription className="text-[11px]">页面切换时保持组件状态</FieldDescription>
                          </FieldContent>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={mutation.isPending}
                          />
                        </Field>
                      )}
                    />
                  )}
                </div>
              </div>
            </FieldGroup>

            <DrawerFooter className="mt-auto border-t px-0 pt-4">
              <div className="flex w-full items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
                  取消
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <>
                      <Spinner className="mr-1.5 size-3.5" />
                      提交中…
                    </>
                  ) : isEdit ? (
                    '保存修改'
                  ) : (
                    '立即创建'
                  )}
                </Button>
              </div>
            </DrawerFooter>
          </form>
        )}
      </DrawerContent>
    </Drawer>
  )
}
