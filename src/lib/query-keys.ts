import type { AppPageQuery } from '@/lib/api/app'
import type { ClientQuery } from '@/lib/api/client'
import type { LogPageQuery } from '@/lib/api/log'
import type { OnlineUserPageQuery } from '@/lib/api/online'
import type { RolePageQuery, RoleUserPageQuery } from '@/lib/api/role'
import type { SmsConfigQuery } from '@/lib/api/sms'
import type { SmsLogPageQuery } from '@/lib/api/sms-log'
import type { StorageQuery } from '@/lib/api/storage'
import type { UserPageQuery } from '@/lib/api/user'

/**
 * Unified query key factories following TanStack Query best practices.
 *
 * Using hierarchical arrays ensures type-safety, prevents typo bugs in string keys,
 * and makes prefix-based query invalidation predictable and reliable across the application.
 */
export const userKeys = {
  all: ['system', 'user'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (query?: UserPageQuery) => [...userKeys.lists(), query] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string | number | null) => [...userKeys.details(), id] as const
}

export const deptKeys = {
  all: ['system', 'dept'] as const,
  trees: () => [...deptKeys.all, 'tree'] as const,
  tree: (query?: { description?: string; status?: number }) => [...deptKeys.trees(), query] as const,
  details: () => [...deptKeys.all, 'detail'] as const,
  detail: (id: string | number | null) => [...deptKeys.details(), id] as const
}

export const menuKeys = {
  all: ['system', 'menu'] as const,
  trees: () => [...menuKeys.all, 'tree'] as const,
  tree: (query?: { title?: string; status?: number }) => [...menuKeys.trees(), query] as const,
  dicts: () => [...menuKeys.all, 'tree-dict'] as const,
  dict: () => [...menuKeys.dicts()] as const,
  details: () => [...menuKeys.all, 'detail'] as const,
  detail: (id: string | number | null) => [...menuKeys.details(), id] as const
}

export const roleKeys = {
  all: ['system', 'role'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  list: (query?: RolePageQuery) => [...roleKeys.lists(), query] as const,
  dicts: () => [...roleKeys.all, 'dict'] as const,
  details: () => [...roleKeys.all, 'detail'] as const,
  detail: (id: string | number | null) => [...roleKeys.details(), id] as const,
  permissions: () => [...roleKeys.all, 'permission-tree'] as const,
  // Prefix key for one role's member list. Invalidation must use this key rather than `users(id)`:
  // `users(id)` appends `undefined` as the query slot, and TanStack Query's `partialMatchKey`
  // rejects a key whose trailing element has a different `typeof` than the cached one.
  usersRoot: (id: string | number | null) => [...roleKeys.all, 'users', id] as const,
  users: (id: string | number | null, query?: RoleUserPageQuery) => [...roleKeys.usersRoot(id), query] as const,
  userIds: (id: string | number | null) => [...roleKeys.all, 'user-ids', id] as const
}

export const appKeys = {
  all: ['open', 'app'] as const,
  lists: () => [...appKeys.all, 'list'] as const,
  list: (query?: AppPageQuery) => [...appKeys.lists(), query] as const,
  details: () => [...appKeys.all, 'detail'] as const,
  detail: (id: string | number | null) => [...appKeys.details(), id] as const,
  secrets: () => [...appKeys.all, 'secret'] as const,
  secret: (id: string | number | null) => [...appKeys.secrets(), id] as const
}

export const optionKeys = {
  all: ['system', 'option'] as const,
  lists: () => [...optionKeys.all, 'list'] as const,
  list: (category?: string) => [...optionKeys.lists(), category] as const
}

export const smsKeys = {
  all: ['system', 'sms'] as const,
  lists: () => [...smsKeys.all, 'list'] as const,
  list: (query?: SmsConfigQuery) => [...smsKeys.lists(), query] as const,
  details: () => [...smsKeys.all, 'detail'] as const,
  detail: (id: string | number | null) => [...smsKeys.details(), id] as const
}

export const smsLogKeys = {
  all: ['system', 'sms-log'] as const,
  lists: () => [...smsLogKeys.all, 'list'] as const,
  list: (query?: SmsLogPageQuery) => [...smsLogKeys.lists(), query] as const
}

export const storageKeys = {
  all: ['system', 'storage'] as const,
  lists: () => [...storageKeys.all, 'list'] as const,
  list: (query?: StorageQuery) => [...storageKeys.lists(), query] as const,
  details: () => [...storageKeys.all, 'detail'] as const,
  detail: (id: string | number | null) => [...storageKeys.details(), id] as const
}

export const clientKeys = {
  all: ['system', 'client'] as const,
  lists: () => [...clientKeys.all, 'list'] as const,
  list: (query?: ClientQuery) => [...clientKeys.lists(), query] as const,
  details: () => [...clientKeys.all, 'detail'] as const,
  detail: (id: string | number | null) => [...clientKeys.details(), id] as const
}

export const dictKeys = {
  all: ['system', 'dict'] as const,
  code: (code: string) => [...dictKeys.all, code] as const
}

export const onlineUserKeys = {
  all: ['monitor', 'online'] as const,
  lists: () => [...onlineUserKeys.all, 'list'] as const,
  list: (query?: OnlineUserPageQuery) => [...onlineUserKeys.lists(), query] as const
}

export const logKeys = {
  all: ['monitor', 'log'] as const,
  lists: () => [...logKeys.all, 'list'] as const,
  list: (query?: LogPageQuery) => [...logKeys.lists(), query] as const,
  details: () => [...logKeys.all, 'detail'] as const,
  detail: (id: string | number | null) => [...logKeys.details(), id] as const
}
