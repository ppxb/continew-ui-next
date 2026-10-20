import { cn } from 'cn'

import { Badge } from '@/components/ui/badge'
import { JOB_EXECUTE_REASON_LABELS, JOB_EXECUTE_STATUS_LABELS, type JobExecuteStatus } from '@/lib/api/job-log'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'

/** A plain text cell, with the shared placeholder for what the backend left empty. */
export function TextCell({ value }: { value: string | number | null | undefined }) {
  return <span className="text-sm">{value || value === 0 ? value : EMPTY_PLACEHOLDER}</span>
}

const STATUS_DOTS: Record<JobExecuteStatus, string> = {
  1: 'bg-sky-500',
  2: 'bg-amber-500',
  3: 'bg-green-600',
  4: 'bg-destructive',
  5: 'bg-destructive',
  6: 'bg-muted-foreground'
}

/** The execution status as a dot badge, mirroring the colors of the Vue client's tags. */
export function JobExecuteStatusBadge({ status }: { status: JobExecuteStatus }) {
  const label = JOB_EXECUTE_STATUS_LABELS[status] ?? EMPTY_PLACEHOLDER

  return (
    <Badge variant="outline">
      <span className={cn('size-1.5 rounded-full', STATUS_DOTS[status] ?? 'bg-muted-foreground')} />
      {label}
    </Badge>
  )
}

/** The execution note; the full label stays available through the native title. */
export function OperationReasonCell({ reason }: { reason: number | null | undefined }) {
  const label = reason === null || reason === undefined ? '无' : (JOB_EXECUTE_REASON_LABELS[reason] ?? String(reason))

  if (label === '无') {
    return <span className="text-sm text-muted-foreground">无</span>
  }

  return (
    <span className="block max-w-56 truncate text-sm" title={label}>
      {label}
    </span>
  )
}
