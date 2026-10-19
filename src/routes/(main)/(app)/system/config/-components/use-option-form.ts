import * as React from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type StandardSchemaV1, useForm } from '@tanstack/react-form'

import { toast } from '@/components/ui/toast'
import { listOption, type OptionReq, type OptionResp, resetOptionValue, updateOption } from '@/lib/api/option'
import { optionKeys } from '@/lib/query-keys'

export type OptionMap = Record<string, OptionResp>

const EMPTY_OPTIONS: OptionResp[] = []

function buildPayload(form: object, optionMap: OptionMap): OptionReq[] {
  const payload: OptionReq[] = []
  for (const [code, value] of Object.entries(form)) {
    const option = optionMap[code]
    if (!option) continue
    payload.push({ id: option.id, code, value: String(value) })
  }
  return payload
}

interface UseOptionFormOptions<TForm extends object> {
  category: string
  toForm: (optionMap: OptionMap) => TForm
  schema: StandardSchemaV1<TForm>
}

export function useOptionForm<TForm extends object>({ category, toForm, schema }: UseOptionFormOptions<TForm>) {
  const queryClient = useQueryClient()

  const [isEdit, setIsEdit] = React.useState(false)
  const [resetDialogOpen, setResetDialogOpen] = React.useState(false)

  const query = useQuery({
    queryKey: optionKeys.list(category),
    queryFn: () => listOption({ category })
  })
  const options = query.data ?? EMPTY_OPTIONS

  const optionMap = React.useMemo(() => {
    const map: OptionMap = {}
    for (const option of options) {
      map[option.code] = option
    }
    return map
  }, [options])

  const form = useForm({
    defaultValues: toForm({}),
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      try {
        await updateOption(buildPayload(value, optionMap))
        toast.add({ title: '保存成功', type: 'success' })
        setIsEdit(false)
        void queryClient.invalidateQueries({ queryKey: optionKeys.list(category) })
      } catch (err) {
        toast.add({ title: err instanceof Error ? err.message : '保存失败', type: 'error' })
      }
    }
  })

  const toFormRef = React.useRef(toForm)
  React.useEffect(() => {
    toFormRef.current = toForm
  })

  React.useEffect(() => {
    if (!isEdit && options.length > 0) {
      form.reset(toFormRef.current(optionMap), { keepDefaultValues: true })
    }
  }, [form, isEdit, optionMap, options.length])

  const resetMutation = useMutation({
    mutationFn: () => resetOptionValue({ category }),
    onSuccess: () => {
      toast.add({ title: '恢复成功', type: 'success' })
      setResetDialogOpen(false)
      setIsEdit(false)
      void queryClient.invalidateQueries({ queryKey: optionKeys.list(category) })
    },
    onError: (err: Error) => {
      toast.add({ title: err.message || '恢复失败', type: 'error' })
    }
  })

  const resetForm = () => form.reset(toFormRef.current(optionMap), { keepDefaultValues: true })

  const cancelEdit = () => {
    resetForm()
    setIsEdit(false)
  }

  const resetToDefault = () => resetMutation.mutate()

  const submit = async () => {
    await form.validate('submit')
    await form.handleSubmit()
  }

  return {
    form,
    optionMap,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    isEdit,
    setIsEdit,
    cancelEdit,
    resetForm,
    submit,
    resetToDefault,
    isResetting: resetMutation.isPending,
    resetDialogOpen,
    setResetDialogOpen
  }
}
