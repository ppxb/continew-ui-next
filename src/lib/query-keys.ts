import type { AppPageQuery } from '@/lib/api/app'
import type { RolePageQuery, RoleUserPageQuery } from '@/lib/api/role'
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
  trees: () => [...deptKeys.all, 'tree'] as const
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
  users: (id: string | number | null, query?: RoleUserPageQuery) => [...roleKeys.all, 'users', id, query] as const,
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
