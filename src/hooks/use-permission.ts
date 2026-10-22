import { useAuthStore } from '@/stores/auth/auth-provider'

/** The backend grants every permission with this code (SystemConstants.ALL_PERMISSION). */
const ALL_PERMISSION = '*:*:*'

export function hasPermission(permissions: readonly string[], code?: string) {
  if (!code) {
    return true
  }

  return permissions.includes(ALL_PERMISSION) || permissions.includes(code)
}

/**
 * Reads the permission codes returned by `GET /auth/user/info`.
 *
 * Permission codes follow the backend convention, for example `system:user:create`
 * for `POST /system/user`.
 */
export function usePermission() {
  const permissions = useAuthStore(state => state.permissions)

  return {
    permissions,
    hasPermission: (code?: string) => hasPermission(permissions, code),
    hasAnyPermission: (codes: readonly string[]) => codes.some(code => hasPermission(permissions, code)),
    hasAllPermissions: (codes: readonly string[]) => codes.every(code => hasPermission(permissions, code))
  }
}
