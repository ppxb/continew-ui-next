import type { ReactNode } from 'react'

import { cn } from 'cn'

import { ToneBadge } from '@/components/tone-badge'
import { Badge } from '@/components/ui/badge'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'

export type TypeTone = 'blue' | 'violet' | 'teal' | 'amber' | 'neutral'

interface TypeBadgeProps {
  readonly tone: TypeTone
  readonly label: string
  readonly className?: string
}

/** A type-kind `ToneBadge`: a category tag without the status dot. */
export function TypeBadge({ tone, label, className }: TypeBadgeProps) {
  return <ToneBadge tone={tone} label={label} kind="type" className={className} />
}

interface FlagBadgeProps {
  readonly active?: boolean | null
  readonly activeLabel: string
  readonly inactiveLabel?: string
  readonly icon?: ReactNode
}

export function FlagBadge({ active, activeLabel, inactiveLabel, icon }: FlagBadgeProps) {
  const isActive = Boolean(active)

  if (!isActive && !inactiveLabel) {
    return null
  }

  return (
    <Badge variant="outline">
      {isActive ? icon : null}
      {isActive ? activeLabel : inactiveLabel}
    </Badge>
  )
}

interface BooleanCellProps {
  readonly active?: boolean | null
  readonly label: string
  readonly icon?: ReactNode
  readonly className?: string
}

export function BooleanCell({ active, label, icon, className }: BooleanCellProps) {
  if (!active) {
    return <span className="text-sm text-muted-foreground">—</span>
  }

  return (
    <Badge
      variant="outline"
      className={cn('gap-1 border-border/60 bg-muted/30 px-1.5 py-0 font-normal text-muted-foreground', className)}
    >
      {icon}
      {label}
    </Badge>
  )
}

interface TagListProps {
  readonly items: readonly string[]
  readonly max?: number
  readonly className?: string
}

export function TagList({ items, max, className }: TagListProps) {
  if (items.length === 0) {
    return <span className="text-sm">{EMPTY_PLACEHOLDER}</span>
  }

  const visibleItems = max === undefined ? items : items.slice(0, max)
  const hiddenCount = items.length - visibleItems.length

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {visibleItems.map(item => (
        <Badge key={item} variant="secondary">
          {item}
        </Badge>
      ))}
      {hiddenCount > 0 ? <Badge variant="secondary">+{hiddenCount}</Badge> : null}
    </div>
  )
}
