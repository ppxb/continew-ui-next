import { http } from '@/lib/http'

/** A row of `GET /system/role/list`, which answers with every role and no paging. */
export interface RoleResp {
  id: string | number
  name: string
  code: string
  description: string | null
}

/** Every role, used to fill the role picker. */
export function listRoles() {
  return http.get<RoleResp[]>('/system/role/list')
}

/** A role option from `GET /system/role/dict`, filtered by the backend for assignment. */
export interface RoleDictResp {
  label: string
  value: string | number
}

/** Role picker options without requiring the role management list permission. */
export function listRoleDict() {
  return http.get<RoleDictResp[]>('/system/role/dict')
}
