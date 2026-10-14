import { http, downloadFile } from '@/lib/http'

/** `DisEnableStatusEnum`: 1 启用, 2 禁用. */
export type UserStatus = 1 | 2

/** `GenderEnum`: 0 未知, 1 男, 2 女. */
export type UserGender = 0 | 1 | 2

/**
 * One row of `GET /system/user`.
 *
 * The backend registers `BaseEnumSerializer`, so `status` and `gender` arrive as the
 * enum's numeric `value` rather than its name. `big-number-serialize-mode: FLEXIBLE`
 * turns ids above the JS safe integer range into strings, and `email`/`phone` are masked
 * before they leave the server.
 */
export interface UserResp {
  id: string | number
  username: string
  nickname: string
  gender: UserGender
  avatar: string | null
  email: string | null
  phone: string | null
  status: UserStatus
  isSystem: boolean
  description: string | null
  deptId: string | number | null
  deptName: string | null
  roleIds: (string | number)[]
  roleNames: string[]
  createUserString: string | null
  createTime: string
  updateUserString: string | null
  updateTime: string | null
  /** True for built-in users and for the signed-in user; the backend rejects edits. */
  disabled: boolean | null
}

/** The backend's `PageResp`: the current page slice plus the total row count. */
export interface PageResp<T> {
  list: T[]
  total: number
}

export type UserPageQuery = {
  page: number
  size: number
  /** Keyword matched against username, nickname and description. */
  description?: string
  status?: UserStatus
  /** `<field>,<asc|desc>`; the user query sorts on its `t1` table alias. */
  sort?: string
}

/** One page of users. */
export function listUsers(query: UserPageQuery) {
  return http.get<PageResp<UserResp>>('/system/user', { query })
}

/** Every user matching the filter, as a file download. */
export function exportUsers(query: Omit<UserPageQuery, 'page' | 'size'>) {
  return downloadFile('/system/user/export', query)
}
