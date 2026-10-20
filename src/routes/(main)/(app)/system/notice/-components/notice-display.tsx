import { cn } from 'cn'

import { Badge } from '@/components/ui/badge'
import type { NoticeStatus } from '@/lib/api/notice'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'

import type { NoticeDictOption } from './use-notice-dicts'

const STATUS_CLASSES: Record<NoticeStatus, string> = {
  1: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  2: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  3: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
}

export function noticeOptionLabel(options: NoticeDictOption[], value?: string | number | null) {
  if (value === null || value === undefined || value === '') {
    return EMPTY_PLACEHOLDER
  }

  return options.find(item => item.value === String(value))?.label ?? String(value)
}

export function NoticeStatusBadge({ status, options }: { status: NoticeStatus; options: NoticeDictOption[] }) {
  return (
    <Badge variant="secondary" className={cn('font-normal', STATUS_CLASSES[status])}>
      {noticeOptionLabel(options, status)}
    </Badge>
  )
}

export function NoticeMethodTags({
  methods,
  options
}: {
  methods: number[] | null | undefined
  options: NoticeDictOption[]
}) {
  if (!methods || methods.length === 0) {
    return <span className="text-sm text-muted-foreground">无</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {methods.map(method => (
        <Badge key={method} variant="outline" className="font-normal">
          {noticeOptionLabel(options, method)}
        </Badge>
      ))}
    </div>
  )
}

export function NoticeTypeBadge({ type, options }: { type?: string | null; options: NoticeDictOption[] }) {
  if (!type) {
    return <span className="text-sm text-muted-foreground">{EMPTY_PLACEHOLDER}</span>
  }

  return (
    <Badge variant="secondary" className="font-normal">
      {noticeOptionLabel(options, type)}
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
