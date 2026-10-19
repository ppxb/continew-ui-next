import { Button } from '@/components/ui/button'

interface RetryHintProps {
  onRetry: () => void
  label?: string
}

/**
 * Retry action for a failed query, built on the shadcn Button so call sites stop rendering a native
 * `<button>` (R4) and the hand-written variants of the same link converge on one.
 */
export function RetryHint({ onRetry, label = '重试' }: RetryHintProps) {
  return (
    <Button type="button" variant="link" size="sm" onClick={onRetry}>
      {label}
    </Button>
  )
}
