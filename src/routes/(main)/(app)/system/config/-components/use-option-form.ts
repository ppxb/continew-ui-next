import * as React from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { toast } from '@/components/ui/toast'
import { listOption, type OptionReq, type OptionResp, resetOptionValue, updateOption } from '@/lib/api/option'
import { optionKeys } from '@/lib/query-keys'

export type OptionMap = Record<string, OptionResp>

const EMPTY_OPTIONS: OptionResp[] = []

/**
 * Builds the batch update payload from a flat form record.
 *
 * Codes missing from `optionMap` are skipped on purpose: the backend resolves every entry by `id`
 * and rejects the whole batch when one is unknown, so sending `id: 0` for a code the server did not
 * return would fail an otherwise valid save.
 */
function buildPayload(form: object, optionMap: OptionMap): OptionReq[] {
  const payload: OptionReq[] = []
  for (const [code, value] of Object.entries(form)) {
    const option = optionMap[code]
    if (!option) continue
    payload.push({ id: option.id, code, value: String(value) })
  }
  return payload
}

interface UseOptionFormOptions<TForm> {
  /** Option category this panel edits, e.g. `SITE`. */
  category: string
  /**
   * Maps the fetched options to the form state. It is also called with an empty map for the initial
   * state, so it owns the defaults; keep the two in sync. Define it at module scope: the hook reads
   * it through a ref, but a stable reference keeps the intent obvious.
   */
  toForm: (optionMap: OptionMap) => TForm
}

/**
 * State layer shared by the form-style config panels: one option category, one editable form, a
 * batch save and a reset-to-default.
 *
 * The form is expected to be a flat record of string/number values; the payload sends them as
 * strings. `isError` is part of the contract because a failed option request used to leave the panel
 * showing the default form, which reads as if the backend held those values.
 */
export function useOptionForm<TForm extends object>({
  category,
  toForm
}: UseOptionFormOptions<TForm>) {
  const queryClient = useQueryClient()

  const [isEdit, setIsEdit] = React.useState(false)
  const [form, setForm] = React.useState<TForm>(() => toForm({}))
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

  // Read the mapper through a ref so a fresh inline arrow cannot re-trigger the sync effect and loop
  // through setForm.
  const toFormRef = React.useRef(toForm)
  React.useEffect(() => {
    toFormRef.current = toForm
  })

  // Refill the form from the server, except while the user is editing.
  React.useEffect(() => {
    if (!isEdit && options.length > 0) {
      setForm(toFormRef.current(optionMap))
    }
  }, [isEdit, optionMap, options.length])

  const saveMutation = useMutation({
    mutationFn: () => updateOption(buildPayload(form, optionMap)),
    onSuccess: () => {
      toast.add({ title: '保存成功', type: 'success' })
      setIsEdit(false)
      void queryClient.invalidateQueries({ queryKey: optionKeys.list(category) })
    },
    onError: (err: Error) => {
      toast.add({ title: err.message || '保存失败', type: 'error' })
    }
  })

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

  /** Discards the edits and restores the values currently held by the server. */
  const resetForm = () => setForm(toFormRef.current(optionMap))

  const cancelEdit = () => {
    resetForm()
    setIsEdit(false)
  }

  const save = () => saveMutation.mutate()

  const resetToDefault = () => resetMutation.mutate()

  return {
    form,
    setForm,
    optionMap,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    isEdit,
    setIsEdit,
    cancelEdit,
    resetForm,
    save,
    isSaving: saveMutation.isPending,
    resetToDefault,
    isResetting: resetMutation.isPending,
    resetDialogOpen,
    setResetDialogOpen
  }
}
