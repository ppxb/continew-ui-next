import { Info } from 'lucide-react'

import { SuccessFailureCell } from '@/components/status-cell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { LogStatus } from '@/lib/api/log'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'

/** A plain text cell, with the shared placeholder for what the backend left empty. */
export function TextCell({ value }: { value: string | null | undefined }) {
  return <span className="text-sm">{value || EMPTY_PLACEHOLDER}</span>
}

/**
 * The 成功/失败 badge, with the exception message one click away for a failed operation.
 *
 * The message sits behind its own focusable button instead of the badge itself, so the
 * tooltip is reachable from the keyboard as well. The content keeps the default left
 * alignment, which the detail drawer relies on; the table cell centers it itself.
 */
export function LogStatusCell({ status, errorMsg }: { status: LogStatus; errorMsg?: string | null }) {
  const isSuccess = status === 1

  return (
    <div className="flex items-center gap-1">
      <SuccessFailureCell status={status} />
      {!isSuccess && errorMsg ? (
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon-xs" />}>
            <Info className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-80 whitespace-pre-wrap">
            {errorMsg}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  )
}

/**
 * The request duration, colored by the Vue client's thresholds: over 500 ms is slow
 * enough to look at, and over 200 ms is worth noticing.
 */
export function TimeTakenCell({ timeTaken }: { timeTaken: number }) {
  const tone =
    timeTaken > 500
      ? 'bg-destructive/10 text-destructive'
      : timeTaken > 200
        ? 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
        : 'bg-green-500/10 text-green-700 dark:text-green-400'

  return (
    <Badge variant="secondary" className={tone}>
      {timeTaken} ms
    </Badge>
  )
}
