import { http } from '@/lib/http'

export interface StorageResp {
  id: string | number
  name: string
  code: string
  status: 1 | 2
  type: 1 | 2
  accessKey?: string
  secretKey?: string
  endpoint?: string
  bucketName: string
  domain: string
  multipartUploadThreshold?: number
  multipartUploadPartSize?: number
  multipartTempDir?: string
  recycleBinEnabled: boolean
  recycleBinPath?: string
  description?: string
  isDefault: boolean
  sort?: number
  createUserString?: string
  createTime?: string
  updateUserString?: string
  updateTime?: string
}

export interface StorageQuery {
  description?: string
  type?: 1 | 2 | string
  sort?: string[]
}

export interface StorageReq {
  name: string
  code: string
  type: 1 | 2
  accessKey?: string
  secretKey?: string
  endpoint?: string
  bucketName: string
  domain: string
  multipartUploadThreshold?: number
  multipartUploadPartSize?: number
  multipartTempDir?: string
  recycleBinEnabled: boolean
  recycleBinPath?: string
  sort?: number
  description?: string
  status?: 1 | 2
}

/** Queries storage list: `GET /system/storage/list` */
export function listStorage(query?: StorageQuery) {
  return http.get<StorageResp[]>('/system/storage/list', {
    query: query as Record<string, string | number | boolean | null | undefined>
  })
}

/** Fetches single storage detail: `GET /system/storage/{id}` */
export function getStorage(id: string | number) {
  return http.get<StorageResp>(`/system/storage/${id}`)
}

/** Creates new storage: `POST /system/storage` */
export function createStorage(body: StorageReq) {
  return http.post<{ id: string | number }>('/system/storage', body)
}

/** Updates storage: `PUT /system/storage/${id}` */
export function updateStorage(id: string | number, body: StorageReq) {
  return http.put<void>(`/system/storage/${id}`, body)
}

/** Batch deletes storages: `DELETE /system/storage` */
export function deleteStorages(ids: Array<string | number>) {
  return http.del<void>('/system/storage', { body: { ids } })
}

/** Sets storage as default: `PUT /system/storage/{id}/default` */
export function setDefaultStorage(id: string | number) {
  return http.put<void>(`/system/storage/${id}/default`)
}

/** Updates storage status: `PUT /system/storage/{id}/status` */
export function updateStorageStatus(id: string | number, status: 1 | 2) {
  return http.put<void>(`/system/storage/${id}/status`, { status })
}
