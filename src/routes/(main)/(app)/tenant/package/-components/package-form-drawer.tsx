import * as React from 'react'

import { revalidateLogic } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { FolderTree } from 'lucide-react'

import { CheckableTree } from '@/components/checkable-tree'
import { EntityDrawer } from '@/components/entity-drawer'
import { useAppForm } from '@/components/form'
import { FormSkeleton } from '@/components/form-skeleton'
import { QueryState } from '@/components/query-state'
import { RequiredMark } from '@/components/required-mark'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import { buildTreeIndex } from '@/components/ui/tree'
import { useFillFormOnce } from '@/hooks/use-fill-form-once'
import {
  createPackage,
  packageKeys,
  updatePackage,
  type PackageDetailResp,
  type PackageMenuNode,
  type PackageReq
} from '@/lib/api/package'
import { tenantKeys } from '@/lib/api/tenant'

import { toMenuTreeNodes, usePackageMenuTree } from './use-package-menu-tree'
import { usePackageDetail } from './use-package-detail'

const formSchema = z.object({
  name: z.string().trim().min(1, '请输入名称').max(30, '名称长度不能超过 30 个字符'),
  // `null` is a cleared input; the refine reports it instead of snapping the value back.
  sort: z
    .number()
    .int('请输入大于 0 的整数')
    .min(1, '请输入大于 0 的整数')
    .nullable()
    .refine(value => value !== null, '请输入排序'),
  description: z.string().max(200, '描述长度不能超过 200 个字符'),
  status: z.union([z.literal(1), z.literal(2)]),
  menuCheckStrictly: z.boolean()
})

// `z.input` keeps `sort` as `number | null`; the refine only narrows the output.
type FormValues = z.input<typeof formSchema>

const EMPTY_FORM: FormValues = {
  name: '',
  sort: 999,
  description: '',
  status: 1,
  menuCheckStrictly: true
}

function toFormValues(pkg: PackageDetailResp): FormValues {
  return {
    name: pkg.name ?? '',
    sort: pkg.sort ?? 999,
    description: pkg.description ?? '',
    status: pkg.status ?? 1,
    menuCheckStrictly: pkg.menuCheckStrictly ?? true
  }
}

/** Keeps the ids the backend sent, so the request does not turn every number into a string. */
function collectRawMenuIds(nodes: PackageMenuNode[], ids = new Map<string, string | number>()) {
  for (const node of nodes) {
    ids.set(String(node.key), node.key)
    if (node.children?.length) {
      collectRawMenuIds(node.children, ids)
    }
  }
  return ids
}

interface PackageFormDrawerProps {
  /** The package being edited, or `null` to create one. */
  readonly packageId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

/** Create and edit form for one package, including the menus it grants. */
export function PackageFormDrawer({ packageId, open, onClose }: PackageFormDrawerProps) {
  const queryClient = useQueryClient()
  const formRef = React.useRef<HTMLFormElement>(null)
  const isCreate = packageId === null

  const detail = usePackageDetail(packageId, { enabled: open && !isCreate })

  const menuTree = usePackageMenuTree(open)

  const treeNodes = React.useMemo(() => toMenuTreeNodes(menuTree.data ?? []), [menuTree.data])
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

  const form = useAppForm({
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

  useFillFormOnce({
    open,
    isEdit: !isCreate,
    entityKey: packageId,
    record: detail.data,
    version: detail.dataUpdatedAt,
    buildValues: ({ isEdit: editing, record }) => (editing && record ? toFormValues(record) : EMPTY_FORM),
    apply: values => form.reset(values, { keepDefaultValues: true }),
    onFilled: ({ isEdit: editing, record }) => {
      setCheckedKeys(editing && record ? (record.menuIds ?? []).map(String) : [])
      setMenuError(null)
    },
    resetOnClose: false
  })

  const handleCheckedChange = (keys: Array<string | number>) => {
    setCheckedKeys(keys)
    setMenuError(null)
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
    <EntityDrawer
      open={open}
      onClose={onClose}
      title={isCreate ? '新增套餐' : '修改套餐'}
      icon={<FolderTree className="size-4" />}
      width={36}
      canClose={() => !form.state.isSubmitting}
    >
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
              <form.AppField name="name" validators={{ onDynamic: formSchema.shape.name }}>
                {field => <field.TextInput label="名称" required maxLength={30} placeholder="请输入名称" />}
              </form.AppField>

              <form.AppField name="sort" validators={{ onDynamic: formSchema.shape.sort }}>
                {field => <field.NumberInput label="排序" min={1} placeholder="请输入排序" />}
              </form.AppField>

              <form.AppField name="description" validators={{ onDynamic: formSchema.shape.description }}>
                {field => <field.TextareaInput label="描述" maxLength={200} rows={3} placeholder="请输入描述" />}
              </form.AppField>

              <form.AppField name="status">
                {field => (
                  <field.SwitchInput
                    label="状态"
                    description={field.state.value === 1 ? '启用后租户可以选择该套餐' : '禁用后租户不能再选择该套餐'}
                  />
                )}
              </form.AppField>

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

          <form.AppForm>
            <form.FormFooter onCancel={onClose} />
          </form.AppForm>
        </form>
      ) : detail.isError ? (
        <QueryState state="error" className="p-6" onRetry={() => void detail.refetch()} />
      ) : (
        <FormSkeleton fields={['input', 'input', 'textarea', 'switch', 'textarea']} />
      )}
    </EntityDrawer>
  )
}
