import { revalidateLogic } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'

import { ListChecks } from 'lucide-react'

import { z } from 'zod'

import { cn } from 'cn'

import { EntityDrawer } from '@/components/entity-drawer'
import { useAppForm } from '@/components/form'
import { FieldGroup } from '@/components/ui/field'
import { toast } from '@/components/ui/toast'
import { useFillFormOnce } from '@/hooks/use-fill-form-once'
import { createDictItem, dictKeys, updateDictItem, type DictItemReq, type DictItemResp } from '@/lib/api/dict'

import { DICT_COLOR_DOT_CLASSES, DICT_COLOR_OPTIONS } from './dict-display'

const formSchema = z.object({
  label: z.string().trim().min(1, '请输入标签').max(30, '标签长度不能超过 30 个字符'),
  value: z.string().trim().min(1, '请输入值').max(30, '值长度不能超过 30 个字符'),
  color: z.string(),
  // `null` is a cleared input; the refine reports it instead of snapping the value back.
  sort: z
    .number()
    .int('排序必须是不小于 1 的整数')
    .min(1, '排序必须是不小于 1 的整数')
    .nullable()
    .refine(value => value !== null, '请输入排序'),
  description: z.string().trim().max(200, '描述长度不能超过 200 个字符'),
  status: z.union([z.literal(1), z.literal(2)])
})

// `z.input` keeps `sort` as `number | null`; the refine only narrows the output.
type DictItemFormValues = z.input<typeof formSchema>

const EMPTY_FORM: DictItemFormValues = {
  label: '',
  value: '',
  color: 'none',
  sort: 999,
  description: '',
  status: 1
}

interface DictItemFormDrawerProps {
  /** The dictionary item being edited, or `null` to create one. */
  readonly item: DictItemResp | null
  readonly dictId: string | number
  readonly open: boolean
  readonly onClose: () => void
}

/** Creates or edits an item of the selected dictionary. */
export function DictItemFormDrawer({ item, dictId, open, onClose }: DictItemFormDrawerProps) {
  const queryClient = useQueryClient()
  const isEdit = item !== null
  const submitLabel = isEdit ? '保存' : '创建'

  const form = useAppForm({
    defaultValues: EMPTY_FORM,
    validators: { onDynamic: formSchema },
    validationLogic: revalidateLogic(),
    onSubmit: async ({ value }) => {
      const body: DictItemReq = {
        label: value.label.trim(),
        value: value.value.trim(),
        // An empty value means no color, like 'none'.
        color: value.color && value.color !== 'none' ? value.color : undefined,
        // The schema rejects `null`, so a submitted value is always a number.
        sort: Number(value.sort),
        description: value.description.trim(),
        status: value.status,
        dictId: item?.dictId ?? dictId
      }

      try {
        if (item) {
          await updateDictItem(item.id, body)
        } else {
          await createDictItem(body)
        }

        toast.add({ title: item ? '修改成功' : '新增成功', type: 'success' })
        void queryClient.invalidateQueries({ queryKey: dictKeys.items() })
        onClose()
      } catch {
        // The HTTP layer already reported the failure.
      }
    }
  })

  useFillFormOnce({
    open,
    isEdit,
    entityKey: item?.id,
    createKey: dictId,
    record: item ?? undefined,
    buildValues: ({ isEdit: editing, record }) =>
      editing && record
        ? {
            label: record.label,
            value: record.value,
            color: record.color || 'none',
            sort: record.sort,
            description: record.description ?? '',
            status: record.status
          }
        : EMPTY_FORM,
    apply: values => form.reset(values, { keepDefaultValues: true }),
    resetOnClose: false
  })

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? '修改字典项' : '新增字典项'}
      icon={<ListChecks className="size-4" />}
      width={32}
      canClose={() => !form.state.isSubmitting}
    >
      <form
        noValidate
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={event => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <form.AppField name="label">
              {field => (
                <field.TextInput label="标签" required maxLength={30} autoComplete="off" placeholder="请输入标签" />
              )}
            </form.AppField>

            <form.AppField name="value">
              {field => (
                <field.TextInput label="值" required maxLength={30} autoComplete="off" placeholder="请输入值" />
              )}
            </form.AppField>

            <form.AppField name="color">
              {field => (
                <field.SelectInput
                  label="颜色"
                  description="仅影响列表里标签的展示颜色"
                  options={DICT_COLOR_OPTIONS}
                  placeholder="请选择颜色"
                  renderOption={option =>
                    option.value === 'none' ? (
                      option.label
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className={cn('size-2 rounded-full', DICT_COLOR_DOT_CLASSES[option.value])} />
                        {option.label}
                      </span>
                    )
                  }
                />
              )}
            </form.AppField>

            <form.AppField name="sort">
              {field => <field.NumberInput label="排序" required min={1} step={1} />}
            </form.AppField>

            <form.AppField name="description">
              {field => (
                <field.TextareaInput
                  label="描述"
                  className="sm:col-span-2"
                  rows={3}
                  maxLength={200}
                  placeholder="请输入描述"
                />
              )}
            </form.AppField>

            <form.AppField name="status">
              {field => (
                <field.SwitchInput
                  label="状态"
                  className="sm:col-span-2"
                  description={field.state.value === 1 ? '启用后该字典项会返回给前端' : '禁用后该字典项不会返回给前端'}
                />
              )}
            </form.AppField>
          </FieldGroup>
        </div>

        <form.AppForm>
          <form.FormFooter onCancel={onClose} submitText={submitLabel} submittingText={`${submitLabel}中`} />
        </form.AppForm>
      </form>
    </EntityDrawer>
  )
}
