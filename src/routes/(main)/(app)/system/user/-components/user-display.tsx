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

export function StatusCell({ status }: { status: UserResp['status'] }) {
  const isEnabled = status === 1

  return (
    <Badge variant="outline" className="gap-1.5 border px-2 py-1 font-medium">
      <span className={isEnabled ? 'size-1.5 rounded-full bg-green-600' : 'size-1.5 rounded-full bg-destructive'} />
      {isEnabled ? '启用' : '禁用'}
    </Badge>
  )
}

export function RoleCell({ roleNames }: { roleNames: string[] }) {
  if (!roleNames.length) {
    return <span className="text-sm">{EMPTY_PLACEHOLDER}</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {roleNames.map(roleName => (
        <Badge key={roleName} variant="secondary" className="font-normal">
          {roleName}
        </Badge>
      ))}
    </div>
  )
}
