import type { ReactNode } from 'react'

import { Star } from 'lucide-react'

import { ToneBadge } from '@/components/tone-badge'
import { Badge } from '@/components/ui/badge'

export type StatusTone = 'success' | 'warning' | 'caution' | 'danger' | 'info' | 'neutral' | 'primary'

interface StatusBadgeProps {
  readonly tone: StatusTone
  readonly label: ReactNode
  readonly className?: string
}

/** A status-kind `ToneBadge` with its leading dot. */
export function StatusBadge({ tone, label, className }: StatusBadgeProps) {
  return <ToneBadge tone={tone} label={label} kind="status" className={className} />
}

export function StatusCell({ status }: { status?: number | null }) {
  const isEnabled = status === 1

  return <StatusBadge tone={isEnabled ? 'success' : 'danger'} label={isEnabled ? '启用' : '禁用'} />
}

export function SuccessFailureCell({ status }: { status?: number | null }) {
  const isSuccess = status === 1

  return <StatusBadge tone={isSuccess ? 'success' : 'danger'} label={isSuccess ? '成功' : '失败'} />
}

/** The 默认 marker, drawn like the 内置 badge of the role screen: an outline badge with its icon. */
export function DefaultBadge() {
  return (
    <Badge variant="outline">
      <Star />
      默认
    </Badge>
  )
}
