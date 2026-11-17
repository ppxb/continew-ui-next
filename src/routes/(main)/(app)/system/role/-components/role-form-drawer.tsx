import * as React from 'react'

import { revalidateLogic, useSelector } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { UserShield } from 'lucide-react'

import { type CheckableTreeNode, CheckableTree } from '@/components/checkable-tree'
import { EntityDrawer } from '@/components/entity-drawer'
import { useAppForm } from '@/components/form'
import { FormSkeleton } from '@/components/form-skeleton'
import { QueryState } from '@/components/query-state'
import { FieldGroup } from '@/components/ui/field'
import { toast } from '@/components/ui/toast'
import { useFillFormOnce } from '@/hooks/use-fill-form-once'
import { deptKeys, getDeptTree, type DeptResp } from '@/lib/api/dept'
import { createRole, DATA_SCOPE_OPTIONS, roleKeys, type RoleReq, updateRole } from '@/lib/api/role'

import { useRoleDetail } from './use-role-detail'

const NAME_PATTERN = /^[\u4e00-\u9fa5a-zA-Z0-9_-]{2,30}$/
const CODE_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{1,29}$/

const formSchema = z
  .object({
    name: z
      .string()
      .min(1, '角色名称不能为空')
      .regex(NAME_PATTERN, '角色名称长度为 2-30 个字符，支持中文、字母、数字、下划线、短横线'),
    code: z
      .string()
      .min(1, '角色编码不能为空')
      .regex(CODE_PATTERN, '角色编码长度为 2-30 个字符，支持大小写字母、数字、下划线，且以字母开头'),
    // `null` while the input is empty, so clearing it no longer snaps back to 1.
    sort: z
      .number()
      .int()
      .min(1, '排序最小值为 1')
      .nullable()
      .refine(value => value !== null, '请输入排序'),
    dataScope: z.literal([1, 2, 3, 4, 5]),
    deptIds: z.array(z.union([z.string(), z.number()])),
    deptCheckStrictly: z.boolean(),
    description: z.string().max(200, '描述长度不能超过 200 个字符').optional().nullable()
  })
  .superRefine((data, ctx) => {
    if (data.dataScope === 5 && data.deptIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['deptIds'],
        message: '自定义数据权限下必须至少选择一个部门'
      })
    }
  })

// The input type, so `sort` may hold `null` while the input is empty.
type FormValues = z.input<typeof formSchema>

const EMPTY_FORM: FormValues = {
  name: '',
  code: '',
  sort: 1,
  dataScope: 1,
  deptIds: [],
  deptCheckStrictly: false,
  description: ''
}

function toCheckableDeptNodes(nodes: DeptResp[]): CheckableTreeNode[] {
  return nodes.map(node => ({
    id: String(node.id),
    parentId: node.parentId ? String(node.parentId) : null,
    label: node.name,
    children: node.children?.length ? toCheckableDeptNodes(node.children) : undefined
  }))
}

interface RoleFormDrawerProps {
  readonly roleId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

export function RoleFormDrawer({ roleId, open, onClose }: RoleFormDrawerProps) {
  const queryClient = useQueryClient()
  const isCreate = roleId === null

  const detail = useRoleDetail(roleId, { enabled: open })

  const depts = useQuery({
    queryKey: deptKeys.trees(),
    queryFn: ({ signal }) => getDeptTree(undefined, signal),
    enabled: open
  })

  const deptTreeData = React.useMemo(() => toCheckableDeptNodes(depts.data ?? []), [depts.data])

  const form = useAppForm({
    defaultValues: EMPTY_FORM,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    onSubmit: async ({ value }) => {
      const payload: RoleReq = {
        name: value.name.trim(),
        code: value.code.trim(),
        // The schema already rejected `null`.
        sort: Number(value.sort),
        dataScope: value.dataScope,
        deptIds: value.dataScope === 5 ? value.deptIds : [],
        deptCheckStrictly: value.dataScope === 5 ? value.deptCheckStrictly : false,
        description: value.description ? value.description.trim() : null
      }

      try {
        if (roleId === null) {
          await createRole(payload)
          toast.add({ title: '新增角色成功', type: 'success' })
        } else {
          await updateRole(roleId, payload)
          toast.add({ title: '修改角色成功', type: 'success' })
        }
      } catch {
        // The HTTP layer already reported the failure.
        return
      }

      onClose()
      void queryClient.invalidateQueries({ queryKey: roleKeys.all })
    }
  })

  // `form.state` is a render-time snapshot, so anything that has to re-render on a form change goes
  // through a subscription: the two watched branches, and the "saving" state that gates closing.
  const dataScope = useSelector(form.store, state => state.values.dataScope)
  const deptCheckStrictly = useSelector(form.store, state => state.values.deptCheckStrictly)
  const isSubmitting = useSelector(form.store, state => state.isSubmitting)

  useFillFormOnce({
    open,
    isEdit: !isCreate,
    entityKey: roleId,
    record: detail.data,
    version: detail.dataUpdatedAt,
    buildValues: ({ isEdit: editing, record }) =>
      editing && record
        ? {
            name: record.name,
            code: record.code,
            sort: record.sort,
            dataScope: record.dataScope,
            deptIds: (record.deptIds ?? []).map(String),
            deptCheckStrictly: record.deptCheckStrictly,
            description: record.description ?? ''
          }
        : { ...EMPTY_FORM },
    apply: values => form.reset(values, { keepDefaultValues: true })
  })

  const renderTextField = (
    name: 'name' | 'code',
    label: string,
    input: { placeholder: string; disabled?: boolean }
  ) => (
    <form.AppField name={name} validators={{ onDynamic: formSchema.shape[name] }}>
      {field => (
        <field.TextInput
          label={label}
          required
          maxLength={30}
          disabled={isSubmitting || input.disabled}
          placeholder={input.placeholder}
        />
      )}
    </form.AppField>
  )

  const isLoading = !isCreate && (detail.isPending || detail.fetchStatus !== 'idle')
  const isDetailError = !isCreate && !isLoading && detail.isError

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      title={isCreate ? '新增角色' : '修改角色'}
      icon={<UserShield className="size-4" />}
      width={32}
      closeDisabled={isSubmitting}
    >
      {isLoading ? (
        <FormSkeleton fields={['input', 'input', 'input', 'input', 'textarea']} />
      ) : isDetailError ? (
        <QueryState state="error" className="p-6" onRetry={() => void detail.refetch()} />
      ) : (
        <form.AppForm>
          <form.FormShell footer={<form.FormFooter onCancel={onClose} />}>
            <FieldGroup>
              {renderTextField('name', '角色名称', { placeholder: '请输入角色名称' })}

              {renderTextField('code', '角色编码', {
                placeholder: '请输入角色编码',
                disabled: !isCreate && Boolean(detail.data?.isSystem)
              })}

              <form.AppField name="sort" validators={{ onDynamic: formSchema.shape.sort }}>
                {field => (
                  <field.NumberInput
                    label="排序"
                    min={1}
                    inputMode="numeric"
                    disabled={isSubmitting}
                    placeholder="数值越小越靠前"
                  />
                )}
              </form.AppField>

              <form.AppField name="dataScope" validators={{ onDynamic: formSchema.shape.dataScope }}>
                {field => <field.SelectInput label="数据权限" options={DATA_SCOPE_OPTIONS} disabled={isSubmitting} />}
              </form.AppField>

              {/* Conditional Department Tree for Custom Data Scope */}
              {dataScope === 5 && (
                <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3">
                  {/* Inverted: the switch shows 联动 while the field stores 独立选择. */}
                  <form.AppField name="deptCheckStrictly">
                    {field => (
                      <field.SwitchInput
                        label="父子联动"
                        description={field.state.value ? '已开启独立选择（不联动）' : '勾选父部门时自动勾选全部子部门'}
                        checkedValue={false}
                        uncheckedValue={true}
                        disabled={isSubmitting}
                      />
                    )}
                  </form.AppField>

                  <form.AppField name="deptIds" validators={{ onDynamic: formSchema.shape.deptIds }}>
                    {field => (
                      <field.CustomField label="选择权限部门" required>
                        {() => (
                          // The tree has no `disabled` prop of its own, so `inert` blocks both the
                          // pointer and the keyboard while a save is in flight.
                          <div
                            inert={isSubmitting}
                            className={isSubmitting ? 'pointer-events-none opacity-50' : undefined}
                          >
                            <CheckableTree
                              data={deptTreeData}
                              checkedKeys={field.state.value}
                              onCheckedChange={field.handleChange}
                              checkStrictly={deptCheckStrictly}
                              loading={depts.isPending}
                              searchPlaceholder="搜索部门"
                              emptyText="未找到相关部门"
                            />
                          </div>
                        )}
                      </field.CustomField>
                    )}
                  </form.AppField>
                </div>
              )}

              {/* The fill always stores a string (`record.description ?? ''`), so the textarea never sees `null`. */}
              <form.AppField name="description" validators={{ onDynamic: formSchema.shape.description }}>
                {field => (
                  <field.TextareaInput
                    label="描述"
                    disabled={isSubmitting}
                    maxLength={200}
                    rows={3}
                    placeholder="请输入角色描述信息（选填）"
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
