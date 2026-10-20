import * as React from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { Shield, X } from 'lucide-react'

import { type CheckableTreeNode, CheckableTree } from '@/components/checkable-tree'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { deptKeys, getDeptTree, type DeptTreeNode } from '@/lib/api/dept'
import { createRole, DATA_SCOPE_OPTIONS, type DataScope, roleKeys, type RoleReq, updateRole } from '@/lib/api/role'

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
    sort: z.number().int().min(1, '排序最小值为 1'),
    dataScope: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
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

type FormValues = z.infer<typeof formSchema>

function toCheckableDeptNodes(nodes: DeptTreeNode[]): CheckableTreeNode[] {
  return nodes.map(node => ({
    id: String(node.id),
    parentId: node.parentId ? String(node.parentId) : null,
    label: node.name,
    children: node.children && node.children.length > 0 ? toCheckableDeptNodes(node.children) : undefined
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

  const detail = useRoleDetail(roleId, { enabled: open && !isCreate, alwaysRefetch: true })

  const depts = useQuery({
    queryKey: deptKeys.trees(),
    queryFn: getDeptTree,
    staleTime: 5 * 60_000,
    enabled: open
  })

  const deptTreeData = React.useMemo(() => {
    return toCheckableDeptNodes(depts.data ?? [])
  }, [depts.data])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: '',
      sort: 1,
      dataScope: 1,
      deptIds: [],
      deptCheckStrictly: false,
      description: ''
    }
  })

  // When editing and detail data arrives, reset form
  React.useEffect(() => {
    if (open) {
      if (isCreate) {
        form.reset({
          name: '',
          code: '',
          sort: 1,
          dataScope: 1,
          deptIds: [],
          deptCheckStrictly: false,
          description: ''
        })
      } else if (detail.data) {
        form.reset({
          name: detail.data.name,
          code: detail.data.code,
          sort: detail.data.sort ?? 1,
          dataScope: (detail.data.dataScope as DataScope) ?? 1,
          deptIds: (detail.data.deptIds ?? []).map(String),
          deptCheckStrictly: Boolean(detail.data.deptCheckStrictly),
          description: detail.data.description ?? ''
        })
      }
    }
  }, [open, isCreate, detail.data, form])

  const watchedDataScope = useWatch({ control: form.control, name: 'dataScope' })
  const watchedDeptCheckStrictly = useWatch({ control: form.control, name: 'deptCheckStrictly' })

  const onSubmit = async (values: FormValues) => {
    try {
      const payload: RoleReq = {
        name: values.name.trim(),
        code: values.code.trim(),
        sort: values.sort,
        dataScope: values.dataScope as DataScope,
        deptIds: values.dataScope === 5 ? values.deptIds : [],
        deptCheckStrictly: values.dataScope === 5 ? values.deptCheckStrictly : false,
        description: values.description ? values.description.trim() : null
      }

      if (isCreate) {
        await createRole(payload)
        toast.add({ title: '新增角色成功', type: 'success' })
      } else {
        await updateRole(roleId, payload)
        toast.add({ title: '修改角色成功', type: 'success' })
      }

      onClose()
      void queryClient.invalidateQueries({ queryKey: roleKeys.all })
    } catch {
      // The HTTP layer already reported the failure.
    }
  }

  const isLoading = !isCreate && detail.isPending

  return (
    <Drawer
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen && !form.formState.isSubmitting) {
          onClose()
        }
      }}
      swipeDirection="right"
    >
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:32rem]">
        <DrawerHeader className="flex-row items-center justify-between gap-2 border-b p-4 md:gap-2">
          <div className="flex items-center gap-2">
            <Shield className="size-4" />
            <DrawerTitle>{isCreate ? '新增角色' : '修改角色'}</DrawerTitle>
          </div>
          <DrawerClose render={<Button variant="ghost" size="icon-sm" />}>
            <X className="size-4" />
            <span className="sr-only">关闭</span>
          </DrawerClose>
        </DrawerHeader>

        {isLoading ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
              <FieldGroup className="gap-4">
                <Controller
                  control={form.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel>角色名称</FieldLabel>
                      <Input
                        {...field}
                        maxLength={30}
                        placeholder="请输入角色名称（如：系统运维管理员）"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="code"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel>角色编码</FieldLabel>
                      <Input
                        {...field}
                        disabled={!isCreate && detail.data?.isSystem}
                        maxLength={30}
                        placeholder="请输入角色编码（如：ops_admin）"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="sort"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel>排序</FieldLabel>
                      <Input
                        type="number"
                        min={1}
                        value={field.value}
                        onChange={e => field.onChange(e.target.valueAsNumber || 1)}
                        placeholder="数值越小越靠前"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="dataScope"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel>数据权限</FieldLabel>
                      <Select
                        items={DATA_SCOPE_OPTIONS.map(opt => ({ value: String(opt.value), label: opt.label }))}
                        value={String(field.value)}
                        onValueChange={val => field.onChange(Number(val) as DataScope)}
                      >
                        <SelectTrigger aria-invalid={fieldState.invalid}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="start" alignItemWithTrigger={false}>
                          <SelectGroup>
                            {DATA_SCOPE_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={String(opt.value)}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                {/* Conditional Department Tree for Custom Data Scope */}
                {watchedDataScope === 5 && (
                  <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3">
                    <Controller
                      control={form.control}
                      name="deptCheckStrictly"
                      render={({ field }) => (
                        <Field orientation="horizontal" className="items-center justify-between">
                          <FieldContent>
                            <FieldLabel className="text-xs">父子联动</FieldLabel>
                            <FieldDescription className="text-[11px]">
                              {field.value ? '已开启独立选择（不联动）' : '勾选父部门时自动勾选全部子部门'}
                            </FieldDescription>
                          </FieldContent>
                          <Switch checked={!field.value} onCheckedChange={checked => field.onChange(!checked)} />
                        </Field>
                      )}
                    />

                    <Controller
                      control={form.control}
                      name="deptIds"
                      render={({ field, fieldState }) => (
                        <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                          <FieldLabel className="text-xs">选择权限部门</FieldLabel>
                          <CheckableTree
                            data={deptTreeData}
                            checkedKeys={field.value}
                            onCheckedChange={field.onChange}
                            checkStrictly={watchedDeptCheckStrictly}
                            loading={depts.isPending}
                            searchPlaceholder="搜索部门"
                            emptyText="未找到相关部门"
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </div>
                )}

                <Controller
                  control={form.control}
                  name="description"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel>描述</FieldLabel>
                      <Textarea
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        maxLength={200}
                        rows={3}
                        placeholder="请输入角色描述信息（选填）"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </FieldGroup>
            </div>

            <DrawerFooter className="flex-row justify-end gap-2 border-t p-4">
              <Button type="button" variant="outline" disabled={form.formState.isSubmitting} onClick={onClose}>
                取消
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Spinner />
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
