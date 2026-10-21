import * as React from 'react'

import { revalidateLogic, useForm } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { FolderTree, X } from 'lucide-react'

import { CheckableTree, type CheckableTreeNode } from '@/components/checkable-tree'
import { RequiredMark } from '@/components/required-mark'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { buildTreeIndex } from '@/components/ui/tree'
import {
  createPackage,
  getPackageMenuTree,
  packageKeys,
  updatePackage,
  type PackageDetailResp,
  type PackageMenuNode,
  type PackageReq
} from '@/lib/api/package'
import { tenantKeys } from '@/lib/api/tenant'

import { usePackageDetail } from './use-package-detail'

/** Menus barely change, so reopening the form should not refetch them. */
const LOOKUP_STALE_MS = 5 * 60_000

const formSchema = z.object({
  name: z.string().trim().min(1, '请输入名称').max(30, '名称长度不能超过 30 个字符'),
  sort: z.string().refine(value => /^\d+$/.test(value) && Number(value) >= 1, '请输入大于 0 的整数'),
  description: z.string().max(200, '描述长度不能超过 200 个字符'),
  status: z.union([z.literal(1), z.literal(2)]),
  menuCheckStrictly: z.boolean()
})

type FormValues = z.infer<typeof formSchema>

const EMPTY_FORM: FormValues = {
  name: '',
  sort: '999',
  description: '',
  status: 1,
  menuCheckStrictly: true
}

/** `sort` becomes a string so it can drive a text input. */
function toFormValues(pkg: PackageDetailResp): FormValues {
  return {
    name: pkg.name ?? '',
    sort: pkg.sort === null || pkg.sort === undefined ? '999' : String(pkg.sort),
    description: pkg.description ?? '',
    status: pkg.status ?? 1,
    menuCheckStrictly: pkg.menuCheckStrictly ?? true
  }
}

/** Maps the backend's simple tree onto the checkable tree's node shape. */
function toTreeNodes(nodes: PackageMenuNode[]): CheckableTreeNode[] {
  return nodes.map(node => ({
    id: String(node.id),
    parentId: node.parentId === null || node.parentId === undefined ? null : String(node.parentId),
    label: node.title,
    children: node.children?.length ? toTreeNodes(node.children) : undefined
  }))
}

/** Keeps the ids the backend sent, so the request does not turn every number into a string. */
function collectRawMenuIds(nodes: PackageMenuNode[], ids = new Map<string, string | number>()) {
  for (const node of nodes) {
    ids.set(String(node.id), node.id)
    if (node.children?.length) {
      collectRawMenuIds(node.children, ids)
    }
  }
  return ids
}

function PackageFormSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  )
}

interface PackageFormDrawerProps {
  /** The package being edited, or `null` to create one. */
  readonly packageId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

/**
 * Create and edit form for one package.
 *
 * The fields and the menu assignment follow the Vue client's `tenant/package/AddModal.vue`.
 * The tree collects the checked rows plus their ancestors, because a tenant's menu tree
 * cannot render a child whose parent was never granted.
 */
export function PackageFormDrawer({ packageId, open, onClose }: PackageFormDrawerProps) {
  const queryClient = useQueryClient()
  const formRef = React.useRef<HTMLFormElement>(null)
  const filledForRef = React.useRef<string | null>(null)
  const isCreate = packageId === null

  const detail = usePackageDetail(packageId, { enabled: open && !isCreate, refreshOnOpen: true })

  const menuTree = useQuery({
    queryKey: packageKeys.menus(),
    queryFn: getPackageMenuTree,
    staleTime: LOOKUP_STALE_MS,
    enabled: open
  })

  const treeNodes = React.useMemo(() => toTreeNodes(menuTree.data ?? []), [menuTree.data])
  const treeIndex = React.useMemo(() => buildTreeIndex(treeNodes), [treeNodes])
  const rawMenuIds = React.useMemo(() => collectRawMenuIds(menuTree.data ?? []), [menuTree.data])

  const [checkedKeys, setCheckedKeys] = React.useState<Array<string | number>>([])
  const [menuError, setMenuError] = React.useState<string | null>(null)

  /** The checked ids plus every ancestor they need, in the ids the backend sent. */
  const selectedMenuIds = React.useCallback(() => {
    const keys = new Set(checkedKeys.map(String))

    for (const key of keys) {
      for (const ancestor of treeIndex.ancestorsMap.get(key) ?? []) {
        keys.add(String(ancestor))
      }
    }

    return [...keys].map(key => rawMenuIds.get(key) ?? key)
  }, [checkedKeys, treeIndex, rawMenuIds])

  const form = useForm({
    defaultValues: EMPTY_FORM,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    onSubmit: async ({ value }) => {
      const body: PackageReq = {
        name: value.name.trim(),
        sort: Number(value.sort),
        menuCheckStrictly: value.menuCheckStrictly,
        description: value.description.trim() || undefined,
        status: value.status,
        menuIds: selectedMenuIds()
      }

      try {
        if (packageId === null) {
          await createPackage(body)
        } else {
          await updatePackage(packageId, body)
        }

        onClose()
        void queryClient.invalidateQueries({ queryKey: packageKeys.all })
        // The tenant list shows the package name, so it goes stale with the package.
        void queryClient.invalidateQueries({ queryKey: tenantKeys.all })
        toast.add({ title: packageId === null ? '新增成功' : '修改成功', type: 'success' })
      } catch {
        // The HTTP layer already reported the failure.
      }
    }
  })

  React.useEffect(() => {
    if (!open) {
      filledForRef.current = null
      return
    }

    if (isCreate) {
      if (filledForRef.current !== 'create') {
        filledForRef.current = 'create'
        form.reset(EMPTY_FORM)
        setCheckedKeys([])
        setMenuError(null)
      }
      return
    }

    if (!detail.data) return

    const key = `${packageId}:${detail.dataUpdatedAt}`
    if (filledForRef.current === key) return
    filledForRef.current = key
    form.reset(toFormValues(detail.data), { keepDefaultValues: true })
    setCheckedKeys((detail.data.menuIds ?? []).map(String))
    setMenuError(null)
  }, [open, isCreate, packageId, detail.data, detail.dataUpdatedAt, form])

  const handleCheckedChange = (keys: Array<string | number>) => {
    setCheckedKeys(keys)
    if (menuError) {
      setMenuError(null)
    }
  }

  const submit = async () => {
    const menuInvalid = checkedKeys.length === 0
    setMenuError(menuInvalid ? '请选择关联菜单' : null)

    await form.validate('submit')
    if (menuInvalid) {
      return
    }

    await form.handleSubmit()

    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    })
  }

  return (
    <Drawer
      open={open}
      onOpenChange={nextOpen => {
        // Closing mid-save would leave the request in flight with no way to report it.
        if (!nextOpen && !form.state.isSubmitting) {
          onClose()
        }
      }}
      swipeDirection="right"
    >
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:36rem]">
        <DrawerHeader className="flex-row items-center justify-between gap-2 border-b p-4 md:gap-2">
          <div className="flex items-center gap-2">
            <FolderTree className="size-4" />
            <DrawerTitle>{isCreate ? '新增套餐' : '修改套餐'}</DrawerTitle>
          </div>
          <DrawerClose render={<Button variant="ghost" size="icon-sm" />}>
            <X />
          </DrawerClose>
        </DrawerHeader>

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
              <FieldGroup className="gap-4">
                <form.Field name="name" validators={{ onDynamic: formSchema.shape.name }}>
                  {field => {
                    const invalid = field.state.meta.errors.length > 0

                    return (
                      <Field className="gap-1.5" data-invalid={invalid}>
                        <FieldLabel>
                          名称
                          <RequiredMark />
                        </FieldLabel>
                        <Input
                          name="name"
                          value={field.state.value}
                          onChange={event => field.handleChange(event.target.value)}
                          onBlur={field.handleBlur}
                          maxLength={30}
                          placeholder="请输入名称"
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
                        <FieldLabel>排序</FieldLabel>
                        <Input
                          type="number"
                          min={1}
                          name="sort"
                          value={field.state.value}
                          onChange={event => field.handleChange(event.target.value)}
                          onBlur={field.handleBlur}
                          placeholder="请输入排序"
                          aria-invalid={invalid}
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
                      <Field className="gap-1.5" data-invalid={invalid}>
                        <FieldLabel>描述</FieldLabel>
                        <Textarea
                          name="description"
                          value={field.state.value}
                          onChange={event => field.handleChange(event.target.value)}
                          onBlur={field.handleBlur}
                          maxLength={200}
                          rows={3}
                          placeholder="请输入描述"
                          aria-invalid={invalid}
                        />
                        <FieldError errors={field.state.meta.errors} />
                      </Field>
                    )
                  }}
                </form.Field>

                <form.Field name="status">
                  {field => (
                    <Field orientation="horizontal" className="items-center justify-between">
                      <FieldContent>
                        <FieldLabel>状态</FieldLabel>
                        <FieldDescription>
                          {field.state.value === 1 ? '启用后租户可以选择该套餐' : '禁用后租户不能再选择该套餐'}
                        </FieldDescription>
                      </FieldContent>
                      <Switch
                        checked={field.state.value === 1}
                        onCheckedChange={checked => field.handleChange(checked ? 1 : 2)}
                      />
                    </Field>
                  )}
                </form.Field>

                <form.Field name="menuCheckStrictly">
                  {field => (
                    <Field className="gap-2" data-invalid={Boolean(menuError)}>
                      <div className="flex items-center justify-between gap-2">
                        <FieldLabel>
                          关联菜单
                          <RequiredMark />
                        </FieldLabel>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">父子联动</span>
                          <Switch checked={field.state.value} onCheckedChange={field.handleChange} />
                        </div>
                      </div>

                      <CheckableTree
                        data={treeNodes}
                        checkedKeys={checkedKeys}
                        onCheckedChange={handleCheckedChange}
                        checkStrictly={!field.state.value}
                        loading={menuTree.isPending}
                        searchPlaceholder="搜索菜单或权限名"
                        emptyText="暂无菜单"
                      />

                      {menuError ? (
                        <FieldError>{menuError}</FieldError>
                      ) : (
                        <FieldDescription>勾选的菜单会授权给该套餐下的所有租户</FieldDescription>
                      )}
                    </Field>
                  )}
                </form.Field>
              </FieldGroup>
            </div>

            <DrawerFooter className="shrink-0 flex-row justify-end gap-2 border-t p-4">
              <Button type="button" variant="outline" disabled={form.state.isSubmitting} onClick={onClose}>
                取消
              </Button>
              <form.Subscribe selector={state => state.isSubmitting}>
                {isSubmitting => (
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
                )}
              </form.Subscribe>
            </DrawerFooter>
          </form>
        ) : detail.isError ? (
          <p className="p-4 text-sm text-foreground">加载失败，请稍后重试</p>
        ) : (
          <PackageFormSkeleton />
        )}
      </DrawerContent>
    </Drawer>
  )
}
