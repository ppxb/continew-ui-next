import { revalidateLogic, useSelector } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { Building2 } from 'lucide-react'

import { EntityDrawer } from '@/components/entity-drawer'
import { FormItem, useAppForm } from '@/components/form'
import { FormSkeleton } from '@/components/form-skeleton'
import { ParentTreeSelect } from '@/components/parent-tree-select'
import { QueryState } from '@/components/query-state'
import { FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { useFillFormOnce } from '@/hooks/use-fill-form-once'
import { createDept, deptKeys, getDept, type DeptReq, type DeptResp, updateDept } from '@/lib/api/dept'
import { toDeptNodeData } from '@/lib/dept-tree'

const formSchema = z.object({
  parentId: z
    .union([z.string(), z.number()])
    .refine(val => val !== null && val !== undefined && val !== '', '请选择上级部门'),
  name: z.string().trim().min(1, '部门名称不能为空').max(30, '部门名称长度不能超过 30 个字符'),
  // A cleared input stores `null`, so the form can report it instead of snapping back to 1.
  sort: z
    .number({ error: '请输入排序' })
    .int()
    .min(1, '排序最小值为 1')
    .nullable()
    .refine(value => value !== null, '请输入排序'),
  status: z.union([z.literal(1), z.literal(2)]),
  description: z.string().max(200, '描述长度不能超过 200 个字符')
})

// The input type: `sort` holds `null` while cleared, and the schema's output narrows it to a number.
type FormValues = z.input<typeof formSchema>

const EMPTY_FORM: FormValues = {
  parentId: '',
  name: '',
  sort: 999,
  status: 1,
  description: ''
}

interface DeptFormDrawerProps {
  readonly deptId: string | number | null
  readonly defaultParentId?: string | number | null
  readonly open: boolean
  readonly deptTree: DeptResp[]
  readonly onClose: () => void
}

export function DeptFormDrawer({ deptId, defaultParentId, open, deptTree, onClose }: DeptFormDrawerProps) {
  const isEdit = deptId !== null
  const queryClient = useQueryClient()

  const detailQuery = useQuery({
    queryKey: deptKeys.detail(deptId),
    queryFn: ({ signal }) => getDept(deptId!, signal),
    enabled: open && isEdit
  })

  const form = useAppForm({
    defaultValues: EMPTY_FORM,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    onSubmit: async ({ value }) => {
      const payload: DeptReq = {
        parentId: value.parentId,
        name: value.name,
        // The schema rejects `null`, so a submitted form always carries a number.
        sort: value.sort as number,
        status: value.status,
        description: value.description || undefined
      }

      try {
        if (isEdit && deptId !== null) {
          await updateDept(deptId, payload)
        } else {
          await createDept(payload)
        }
      } catch {
        // The HTTP layer already reported the failure.
        return
      }

      onClose()
      void queryClient.invalidateQueries({ queryKey: deptKeys.all })
      toast.add({ title: isEdit ? '修改部门成功' : '新增部门成功', type: 'success' })
    }
  })

  // `form.state.isSubmitting` is a render-time snapshot, so the close guard, the close button and the
  // footer all read the subscribed value instead. It covers the whole request, unlike a `mutate()`
  // call that returns before the response lands.
  const isSubmitting = useSelector(form.store, state => state.isSubmitting)

  const isRootDept = isEdit && (detailQuery.data?.parentId === 0 || detailQuery.data?.parentId === null)

  // A create waits until it has a parent to default to, then fills once: a tree that arrives after
  // the drawer opened must not overwrite what the user already typed.
  const createParentId = defaultParentId ?? (deptTree.length > 0 ? deptTree[0].id : null)
  useFillFormOnce({
    open,
    isEdit,
    entityKey: deptId,
    record: detailQuery.data,
    version: detailQuery.dataUpdatedAt,
    ready: isEdit || createParentId !== null,
    buildValues: ({ isEdit: editing, record }) =>
      editing && record
        ? {
            parentId: record.parentId === null || record.parentId === undefined ? 0 : record.parentId,
            name: record.name ?? '',
            sort: record.sort ?? 999,
            status: record.status ?? 1,
            description: record.description ?? ''
          }
        : { ...EMPTY_FORM, parentId: createParentId ?? '' },
    apply: values => form.reset(values, { keepDefaultValues: true })
  })

  const isLoadingDetail = isEdit && detailQuery.isLoading
  const isDetailError = isEdit && detailQuery.isError

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? '修改部门' : '新增部门'}
      icon={<Building2 className="size-4" />}
      width={30}
      closeDisabled={isSubmitting}
    >
      {isLoadingDetail ? (
        <FormSkeleton fields={['input', 'input', 'input', 'switch', 'textarea']} />
      ) : isDetailError ? (
        <QueryState state="error" className="p-6" onRetry={() => void detailQuery.refetch()} />
      ) : (
        <form.AppForm>
          <form.FormShell footer={<form.FormFooter onCancel={onClose} />}>
            <FieldGroup className="gap-4">
              {!isRootDept ? (
                <form.AppField name="parentId" validators={{ onDynamic: formSchema.shape.parentId }}>
                  {field => (
                    <field.CustomField label="上级部门" required>
                      {({ id, invalid }) => (
                        <ParentTreeSelect
                          id={id}
                          value={field.state.value}
                          onChange={next => field.handleChange(next ?? '')}
                          data={deptTree}
                          currentId={deptId}
                          toNodeData={toDeptNodeData}
                          disabled={isSubmitting}
                          invalid={invalid}
                          placeholder="选择上级部门"
                          searchPlaceholder="搜索上级部门"
                          emptyText="未找到相关部门"
                        />
                      )}
                    </field.CustomField>
                  )}
                </form.AppField>
              ) : (
                <FormItem id="dept-root-parent" label="上级部门" description="根机构部门不支持变更上级部门" errors={[]}>
                  <Input id="dept-root-parent" value="顶级部门（根机构）" disabled readOnly />
                </FormItem>
              )}

              <form.AppField name="name" validators={{ onDynamic: formSchema.shape.name }}>
                {field => (
                  <field.TextInput
                    label="部门名称"
                    required
                    placeholder="请输入部门名称，例如：研发中心"
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
                    placeholder="请输入排序值（越小越靠前）"
                    disabled={isSubmitting}
                  />
                )}
              </form.AppField>

              <form.AppField name="status" validators={{ onDynamic: formSchema.shape.status }}>
                {field => (
                  <field.SwitchInput
                    label="部门状态"
                    description={
                      field.state.value === 1
                        ? '启用状态，允许部门下属人员正常访问'
                        : '禁用状态，禁用后该部门直属用户会话将失效'
                    }
                    disabled={isSubmitting}
                  />
                )}
              </form.AppField>

              <form.AppField name="description" validators={{ onDynamic: formSchema.shape.description }}>
                {field => (
                  <field.TextareaInput
                    label="部门描述"
                    placeholder="请输入部门描述信息（选填，最大 200 字）"
                    rows={3}
                    disabled={isSubmitting}
                  />
                )}
              </form.AppField>
            </FieldGroup>
          </form.FormShell>
        </form.AppForm>
      )}
    </EntityDrawer>
  )
}
