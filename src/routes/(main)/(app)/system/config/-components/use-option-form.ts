import * as React from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ProFormInstance, ProValues } from '@/components/pro'

import { toast } from '@/components/ui/toast'
import { listOption, type OptionReq, type OptionResp, resetOptionValue, updateOption } from '@/lib/api/option'
import { reportError } from '@/lib/http'
import { optionKeys, siteOptionKeys } from '@/lib/query-keys'

export type OptionMap = Record<string, OptionResp>

const EMPTY_OPTIONS: OptionResp[] = []

/**
 * Codes missing from `optionMap` are skipped: the backend resolves every entry by `id` and rejects
 * the batch otherwise.
 */
function buildPayload(values: object, optionMap: OptionMap): OptionReq[] {
  const payload: OptionReq[] = []
  for (const [code, value] of Object.entries(values)) {
    const option = optionMap[code]
    if (!option) continue
    payload.push({ id: option.id, code, value: String(value) })
  }
  return payload
}

interface UseOptionFormOptions<TForm extends ProValues> {
  category: string
  toForm: (optionMap: OptionMap) => TForm
}

export interface OptionFormController<TForm extends ProValues> {
  formRef: React.RefObject<ProFormInstance | undefined>
  initialValues: TForm
  optionMap: OptionMap
  isLoading: boolean
  isError: boolean
  refetch: () => Promise<unknown>
  isEdit: boolean
  startEdit: () => void
  cancelEdit: () => void
  resetForm: () => void
  save: (values: object) => Promise<boolean>
  resetToDefault: () => void
  isResetting: boolean
  resetDialogOpen: boolean
  setResetDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
}

export function useOptionForm<TForm extends ProValues>({ category, toForm }: UseOptionFormOptions<TForm>): OptionFormController<TForm> {
  const queryClient = useQueryClient()
  // Public site metadata has its own cache, separate from the editable option list.
  const refreshSiteOptions = () => {
    if (category === 'SITE') {
      void queryClient.invalidateQueries({ queryKey: siteOptionKeys.all })
    }
  }
  const formRef = React.useRef<ProFormInstance>(undefined)
  const [isEdit, setIsEdit] = React.useState(false)
  const [resetDialogOpen, setResetDialogOpen] = React.useState(false)
  const query = useQuery({
    queryKey: optionKeys.list(category),
    queryFn: ({ signal }) => listOption({ category }, signal)
  })
  const options = query.data ?? EMPTY_OPTIONS
  const optionMap = React.useMemo(() => {
    const map: OptionMap = {}
    for (const option of options) map[option.code] = option
    return map
  }, [options])
  const initialValues = React.useMemo(() => toForm(optionMap), [optionMap, toForm])
  const resetForm = () => {
    formRef.current?.resetFields()
    formRef.current?.setFieldsValue(initialValues)
  }

  // Refetches refresh the read view, but never replace an in-progress edit.
  React.useEffect(() => {
    if (!isEdit && query.data) formRef.current?.setFieldsValue(initialValues)
  }, [initialValues, isEdit, query.data])

  const startEdit = () => {
    resetForm()
    setIsEdit(true)
  }
  const cancelEdit = () => {
    resetForm()
    setIsEdit(false)
  }
  const save = async (values: object) => {
    if (!isEdit) return false
    try {
      await updateOption(buildPayload(values, optionMap))
      toast.add({ title: '保存成功', type: 'success' })
      setIsEdit(false)
      void queryClient.invalidateQueries({ queryKey: optionKeys.list(category) })
      refreshSiteOptions()
      return true
    } catch (error) {
      reportError(error, '保存失败')
      return false
    }
  }
  const resetMutation = useMutation({
    mutationFn: () => resetOptionValue({ category }),
    onSuccess: () => {
      toast.add({ title: '恢复成功', type: 'success' })
      setResetDialogOpen(false)
      setIsEdit(false)
      void queryClient.invalidateQueries({ queryKey: optionKeys.list(category) })
      refreshSiteOptions()
    },
    onError: error => reportError(error, '恢复失败')
  })

  return {
    formRef,
    initialValues,
    optionMap,
    isLoading: query.isLoading,
    isError: query.isError && !query.data,
    refetch: query.refetch,
    isEdit,
    startEdit,
    cancelEdit,
    resetForm,
    save,
    resetToDefault: () => resetMutation.mutate(),
    isResetting: resetMutation.isPending,
    resetDialogOpen,
    setResetDialogOpen
  }
}
