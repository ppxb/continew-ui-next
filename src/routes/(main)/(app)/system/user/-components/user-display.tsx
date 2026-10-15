import { Badge } from '@/components/ui/badge'
import type { UserResp } from '@/lib/api/user'

/** Stands in for a value the backend masks or leaves empty. */
export const EMPTY_PLACEHOLDER = '—'

/** `GenderEnum` arrives as its numeric value. */
const GENDER_LABELS: Record<number, string> = {
  0: '未知',
  1: '男',
  2: '女'
}

export function genderLabel(gender: UserResp['gender']) {
  return GENDER_LABELS[gender] ?? '未知'
}

/** The name to show for a user: the nickname when it is set, the username otherwise. */
export function userLabel(user: Pick<UserResp, 'nickname' | 'username'>) {
  return user.nickname || user.username
}

export function StatusCell({ status }: { status?: UserResp['status'] | number | null }) {
  const isEnabled = status === 1

  return (
    <Badge variant="secondary">
      <span className={isEnabled ? 'size-1.5 rounded-full bg-green-600' : 'size-1.5 rounded-full bg-destructive'} />
      {isEnabled ? '启用' : '禁用'}
    </Badge>
  )
}

interface RoleCellProps {
  readonly roleNames: string[]
  /**
   * Collapse the list into one badge, as in `系统管理员 +3`.
   *
   * The table column turns this on: a user can carry many roles, and rendering every one of them
   * wrapped the cell onto several lines. The detail drawer leaves it off, because showing the
   * whole record is the point of that view.
   */
  readonly collapsed?: boolean
}

/** The role column, one badge per role unless it is asked to collapse. */
export function RoleCell({ roleNames, collapsed = false }: RoleCellProps) {
  if (!roleNames.length) {
    return <span className="text-sm">{EMPTY_PLACEHOLDER}</span>
  }

  if (!collapsed) {
    return (
      <div className="flex flex-wrap gap-1">
        {roleNames.map(roleName => (
          <Badge key={roleName} variant="secondary">
            {roleName}
          </Badge>
        ))}
      </div>
    )
  }

  const [firstRoleName, ...hiddenRoleNames] = roleNames
  const label = hiddenRoleNames.length ? `${firstRoleName} +${hiddenRoleNames.length}` : firstRoleName

  return <Badge variant="secondary">{label}</Badge>
}
