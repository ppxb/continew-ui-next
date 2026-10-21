import { TagList } from '@/components/data-badge'
import type { UserResp } from '@/lib/api/user'

/** `GenderEnum` arrives as its numeric value. */
const GENDER_LABELS: Record<number, string> = {
  0: '未知',
  1: '男',
  2: '女'
}

export function genderLabel(gender: UserResp['gender']) {
  return GENDER_LABELS[gender] ?? '未知'
}

export function RoleCell({ roleNames, max }: { roleNames: string[]; max?: number }) {
  return <TagList items={roleNames} max={max} />
}
