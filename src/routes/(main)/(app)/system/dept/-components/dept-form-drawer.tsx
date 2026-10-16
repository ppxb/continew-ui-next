import * as React from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { Building2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { createDept, deptKeys, getDept, type DeptReq, type DeptResp, updateDept } from '@/lib/api/dept'

import { DeptParentSelect } from './dept-parent-select'

const formSchema = z.object({
  parentId: z
    .union([z.string(), z.number()])
    .refine(val => val !== null && val !== undefined && val !== '', '请选择上级部门'),
  name: z.string().trim().min(1, '部门名称不能为空').max(30, '部门名称长度不能超过 30 个字符'),
  sort: z.number().int().min(1, '排序最小值为 1'),
  status: z.number().int().min(1).max(2),
  description: z.string().max(200, '描述长度不能超过 200 个字符')
})

type FormValues = z.infer<typeof formSchema>

const EMPTY_FORM: FormValues = {
  parentId: '',
  name: '',
  sort: 999,
  status: 1,
  description: ''
}

function DeptFormSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col p-4">
      <div className="flex flex-col gap-4">
        {/* Parent Dept */}
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-full" />
        </div>
        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-full" />
        </div>
        {/* Sort */}
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-9 w-full" />
        </div>
        {/* Status */}
        <div className="flex items-center justify-between py-1">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3.5 w-48" />
          </div>
          <Skeleton className="h-5 w-9 rounded-full" />
        </div>
        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  )
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
    queryFn: () => getDept(deptId!),
    enabled: open && isEdit
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY_FORM
  })

  const isRootDept = isEdit && (detailQuery.data?.parentId === 0 || detailQuery.data?.parentId === null)

  // Synchronize form values whenever the drawer opens or record changes
  React.useEffect(() => {
    if (!open) {
      form.reset(EMPTY_FORM)
      return
    }

    if (isEdit && detailQuery.data) {
      const data = detailQuery.data
      form.reset({
        parentId: data.parentId === null || data.parentId === undefined ? 0 : data.parentId,
        name: data.name ?? '',
        sort: data.sort ?? 999,
        status: data.status ?? 1,
        description: data.description ?? ''
      })
    } else if (!isEdit) {
      form.reset({
        ...EMPTY_FORM,
        parentId: defaultParentId ?? (deptTree.length > 0 ? deptTree[0].id : '')
      })
    }
  }, [open, isEdit, detailQuery.data, defaultParentId, deptTree, form])

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: DeptReq = {
        parentId: values.parentId,
        name: values.name,
        sort: values.sort,
        status: values.status as 1 | 2,
        description: values.description || undefined
      }

      if (isEdit && deptId !== null) {
        await updateDept(deptId, payload)
      } else {
        await createDept(payload)
      }
    },
    onSuccess: () => {
      toast.add({
        title: isEdit ? '修改部门成功' : '新增部门成功',
        type: 'success'
      })
      void queryClient.invalidateQueries({ queryKey: deptKeys.all })
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

  const isLoadingDetail = isEdit && detailQuery.isLoading

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
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:30rem]">
        <DrawerHeader className="flex-row items-center justify-between gap-2 border-b p-4 md:gap-2">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Building2 className="size-4" />
            </div>
            <DrawerTitle className="text-base font-semibold">{isEdit ? '修改部门' : '新增部门'}</DrawerTitle>
          </div>
          <DrawerClose render={<Button variant="ghost" size="icon-sm" disabled={mutation.isPending} />}>
            <X className="size-4" />
            <span className="sr-only">关闭</span>
          </DrawerClose>
        </DrawerHeader>

        {isLoadingDetail ? (
          <DeptFormSkeleton />
        ) : (
          <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
              <FieldGroup className="gap-4">
                {/* Parent Department */}
                {!isRootDept ? (
                  <Controller
                    control={form.control}
                    name="parentId"
                    render={({ field, fieldState }) => (
                      <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                        <FieldLabel>
                          上级部门
                          <span className="text-destructive">*</span>
                        </FieldLabel>
                        <DeptParentSelect
                          value={field.value}
                          onChange={field.onChange}
                          deptTree={deptTree}
                          currentDeptId={deptId}
                          disabled={mutation.isPending}
                          invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                ) : (
                  <Field className="gap-1.5">
                    <FieldLabel>上级部门</FieldLabel>
                    <Input value="顶级部门（根机构）" disabled readOnly />
                    <FieldDescription>根机构部门不支持变更上级部门</FieldDescription>
                  </Field>
                )}

                {/* Department Name */}
                <Controller
                  control={form.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="dept-name">
                        部门名称
                        <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        {...field}
                        id="dept-name"
                        placeholder="请输入部门名称，例如：研发中心"
                        disabled={mutation.isPending}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                {/* Sort */}
                <Controller
                  control={form.control}
                  name="sort"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="dept-sort">
                        排序
                        <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        id="dept-sort"
                        type="number"
                        min={1}
                        value={field.value}
                        onChange={e => field.onChange(e.target.valueAsNumber || 1)}
                        placeholder="请输入排序值（越小越靠前）"
                        disabled={mutation.isPending}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                {/* Status Switch */}
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Field orientation="horizontal" className="items-center justify-between">
                      <FieldContent>
                        <FieldLabel>部门状态</FieldLabel>
                        <FieldDescription>
                          {field.value === 1
                            ? '启用状态，允许部门下属人员正常访问'
                            : '禁用状态，禁用后该部门直属用户会话将失效'}
                        </FieldDescription>
                      </FieldContent>
                      <Switch
                        checked={field.value === 1}
                        onCheckedChange={checked => field.onChange(checked ? 1 : 2)}
                        disabled={mutation.isPending}
                      />
                    </Field>
                  )}
                />

                {/* Description */}
                <Controller
                  control={form.control}
                  name="description"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="dept-description">部门描述</FieldLabel>
                      <Textarea
                        {...field}
                        id="dept-description"
                        placeholder="请输入部门描述信息（选填，最大 200 字）"
                        rows={3}
                        disabled={mutation.isPending}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </FieldGroup>
            </div>

            <DrawerFooter className="border-t p-4">
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>
                  取消
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <>
                      <Spinner />
                      保存中
                    </>
                  ) : (
                    '保存'
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
