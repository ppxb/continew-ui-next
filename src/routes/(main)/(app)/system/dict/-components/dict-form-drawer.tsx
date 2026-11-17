import { revalidateLogic } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'

import { Bookmark } from 'lucide-react'

import { z } from 'zod'

import { EntityDrawer } from '@/components/entity-drawer'
import { useAppForm } from '@/components/form'
import { FieldGroup } from '@/components/ui/field'
import { toast } from '@/components/ui/toast'
import { useFillFormOnce } from '@/hooks/use-fill-form-once'
import { createDict, dictKeys, updateDict, type DictResp } from '@/lib/api/dict'

const NAME_PATTERN = /^[一-龥a-zA-Z0-9_-]{2,30}$/
const CODE_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{1,29}$/

const formSchema = z.object({
  name: z.string().trim().regex(NAME_PATTERN, '名称长度为 2-30 个字符，支持中文、字母、数字、下划线、短横线'),
  code: z.string().trim().regex(CODE_PATTERN, '编码长度为 2-30 个字符，以字母开头，支持字母、数字、下划线'),
  description: z.string().trim().max(200, '描述长度不能超过 200 个字符')
})

type DictFormValues = z.infer<typeof formSchema>

const EMPTY_FORM: DictFormValues = {
  name: '',
  code: '',
  description: ''
}

interface DictFormDrawerProps {
  /** The dictionary being edited, or `null` to create one. */
  readonly dict: DictResp | null
  readonly open: boolean
  readonly onClose: () => void
}

/** Creates a dictionary or edits its name and description; the code cannot change after creation. */
export function DictFormDrawer({ dict, open, onClose }: DictFormDrawerProps) {
  const queryClient = useQueryClient()
  const isEdit = dict !== null
  const submitLabel = isEdit ? '保存' : '创建'

  const form = useAppForm({
    defaultValues: EMPTY_FORM,
    validators: { onDynamic: formSchema },
    validationLogic: revalidateLogic(),
    onSubmit: async ({ value }) => {
      const body = {
        name: value.name.trim(),
        code: value.code.trim(),
        description: value.description.trim()
      }

      try {
        if (dict) {
          await updateDict(dict.id, body)
        } else {
          await createDict(body)
        }

        toast.add({ title: dict ? '修改成功' : '新增成功', type: 'success' })
        void queryClient.invalidateQueries({ queryKey: dictKeys.lists() })
        onClose()
      } catch {
        // The HTTP layer already reported the failure.
      }
    }
  })

  useFillFormOnce({
    open,
    isEdit,
    entityKey: dict?.id,
    record: dict ?? undefined,
    buildValues: ({ isEdit: editing, record }) =>
      editing && record ? { name: record.name, code: record.code, description: record.description ?? '' } : EMPTY_FORM,
    apply: values => form.reset(values, { keepDefaultValues: true }),
    resetOnClose: false
  })

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? '修改字典' : '新增字典'}
      icon={<Bookmark className="size-4" />}
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
            <form.AppField name="name">
              {field => (
                <field.TextInput label="名称" required maxLength={30} autoComplete="off" placeholder="请输入字典名称" />
              )}
            </form.AppField>

            <form.AppField name="code">
              {field => (
                <field.TextInput
                  label="编码"
                  required
                  description={isEdit ? '编码创建后不可修改' : undefined}
                  maxLength={30}
                  autoComplete="off"
                  disabled={isEdit}
                  placeholder="请输入字典编码"
                />
              )}
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
          </FieldGroup>
        </div>

        <form.AppForm>
          <form.FormFooter onCancel={onClose} submitText={submitLabel} submittingText={`${submitLabel}中`} />
        </form.AppForm>
      </form>
    </EntityDrawer>
  )
}
