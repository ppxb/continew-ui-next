import { hasPermission } from '@/hooks/use-permission'
import { useAuthStore } from '@/stores/auth/auth-provider'

interface CanProps {
  /** Single permission code, for example `system:user:create`. */
  readonly permission?: string
  /** Renders when the user holds at least one of these codes. */
  readonly anyOf?: readonly string[]
  /** Renders when the user holds every one of these codes. */
  readonly allOf?: readonly string[]
  readonly fallback?: React.ReactNode
  readonly children: React.ReactNode
}

/**
 * Renders its children only when the current user holds the required permissions.
 *
 * The backend already hides menus and rejects unauthorized calls, so this is for
 * buttons and actions inside a page.
 */
export function Can({ permission, anyOf, allOf, fallback = null, children }: CanProps) {
  const permissions = useAuthStore(state => state.permissions)

  const allowed =
    hasPermission(permissions, permission) &&
    (!anyOf?.length || anyOf.some(code => hasPermission(permissions, code))) &&
    (!allOf?.length || allOf.every(code => hasPermission(permissions, code)))

  return allowed ? children : fallback
}
