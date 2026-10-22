import { useQuery } from '@tanstack/react-query'

import { listDict, type LabelValueResp } from '@/lib/api/common'
import { dictKeys } from '@/lib/query-keys'

export interface NoticeDictOption {
  readonly value: string
  readonly label: string
}

const FALLBACK_SCOPE: NoticeDictOption[] = [
  { value: '1', label: '所有人' },
  { value: '2', label: '指定用户' }
]

const FALLBACK_METHODS: NoticeDictOption[] = [
  { value: '1', label: '系统消息' },
  { value: '2', label: '登录弹窗' }
]

const FALLBACK_STATUS: NoticeDictOption[] = [
  { value: '1', label: '草稿' },
  { value: '2', label: '待发布' },
  { value: '3', label: '已发布' }
]

function normalize(options: LabelValueResp[]): NoticeDictOption[] {
  return options.map(item => ({ value: String(item.value), label: item.label }))
}

/** The four dictionaries the Vue notice screens use: one user dict and three enum dicts. */
export function useNoticeDicts() {
  const typeQuery = useQuery({
    queryKey: dictKeys.code('notice_type'),
    queryFn: ({ signal }) => listDict('notice_type', signal)
  })

  const scopeQuery = useQuery({
    queryKey: dictKeys.code('notice_scope_enum'),
    queryFn: ({ signal }) => listDict('notice_scope_enum', signal)
  })

  const methodQuery = useQuery({
    queryKey: dictKeys.code('notice_method_enum'),
    queryFn: ({ signal }) => listDict('notice_method_enum', signal)
  })

  const statusQuery = useQuery({
    queryKey: dictKeys.code('notice_status_enum'),
    queryFn: ({ signal }) => listDict('notice_status_enum', signal)
  })

  const typeOptions = normalize(typeQuery.data ?? [])
  const scopeOptions = normalize(scopeQuery.data ?? [])
  const methodOptions = normalize(methodQuery.data ?? [])
  const statusOptions = normalize(statusQuery.data ?? [])

  return {
    typeOptions,
    scopeOptions: scopeOptions.length > 0 ? scopeOptions : FALLBACK_SCOPE,
    methodOptions: methodOptions.length > 0 ? methodOptions : FALLBACK_METHODS,
    statusOptions: statusOptions.length > 0 ? statusOptions : FALLBACK_STATUS
  }
}
