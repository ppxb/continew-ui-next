import { cn } from 'cn'

import { Badge } from '@/components/ui/badge'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'

export const DICT_COLOR_OPTIONS = [
  { value: 'none', label: '无颜色' },
  { value: 'primary', label: '主要' },
  { value: 'success', label: '成功' },
  { value: 'warning', label: '警告' },
  { value: 'error', label: '错误' },
  { value: 'default', label: '默认' }
] as const

const DICT_COLOR_BADGE_CLASSES: Record<string, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-status-success/10 text-status-success-foreground',
  warning: 'bg-status-warning/10 text-status-warning-foreground',
  error: 'bg-destructive/10 text-destructive',
  default: 'bg-muted text-muted-foreground'
}

export const DICT_COLOR_DOT_CLASSES: Record<string, string> = {
  primary: 'bg-primary',
  success: 'bg-status-success',
  warning: 'bg-status-warning',
  error: 'bg-destructive',
  default: 'bg-muted-foreground'
}

/** A label rendered with the color saved on the dictionary item, if any. */
export function DictLabelBadge({ label, color }: { label: string; color?: string | null }) {
  const colorClass = color ? DICT_COLOR_BADGE_CLASSES[color] : undefined

  if (!colorClass) {
    return <span className="text-sm">{label}</span>
  }

  return (
    <Badge variant="secondary" className={cn('font-normal', colorClass)}>
      {label}
    </Badge>
  )
}

/** A compact, truncating text cell with the value exposed through the native title. */
export function TextCell({ value, className }: { value?: string | number | null; className?: string }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-sm text-muted-foreground">{EMPTY_PLACEHOLDER}</span>
  }

  return (
    <span className={cn('block max-w-56 truncate text-sm', className)} title={String(value)}>
      {value}
    </span>
  )
}
