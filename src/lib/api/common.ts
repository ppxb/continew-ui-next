import { http } from '@/lib/http'

export interface LabelValueResp<T = string> {
  label: string
  value: T
  disabled?: boolean
}

export interface FileUploadResp {
  id: string | number
  url: string
  thUrl?: string
  metadata?: Record<string, unknown>
}

/** Fetches dictionary items by dict code: `GET /system/common/dict/{code}` */
export function listDict(code: string) {
  return http.get<LabelValueResp[]>(`/system/common/dict/${code}`)
}

/** Uploads a file: `POST /system/common/file` */
export function uploadFile(file: File, parentPath = '/') {
  const formData = new FormData()
  formData.append('file', file)
  return http.post<FileUploadResp>('/system/common/file', formData, {
    query: { parentPath }
  })
}

/** Fetches public site option dict: `GET /system/common/dict/option/site` */
export function listSiteOptionDict() {
  return http.get<LabelValueResp<string>[]>('/system/common/dict/option/site')
}
