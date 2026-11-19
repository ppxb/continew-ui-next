import { http } from '@/lib/http'

export interface LabelValueResp<T = string> {
  label: string
  value: T
  disabled?: boolean
}

/** Fetches dictionary items by dict code: `GET /system/common/dict/{code}` */
export function listDict(code: string, signal?: AbortSignal) {
  return http.get<LabelValueResp[]>(`/system/common/dict/${code}`, { signal })
}

/** Fetches public site option dict: `GET /system/common/dict/option/site` */
export function listSiteOptionDict(signal?: AbortSignal) {
  return http.get<LabelValueResp<string>[]>('/system/common/dict/option/site', { signal })
}
