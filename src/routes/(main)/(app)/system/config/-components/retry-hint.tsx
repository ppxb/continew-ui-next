import { Button } from '@/components/ui/button'

interface RetryHintProps {
  onRetry: () => void
  label?: string
}

export function RetryHint({ onRetry, label = '重试' }: RetryHintProps) {
  return (
    <Button type="button" variant="link" size="sm" onClick={onRetry}>
      {label}
    </Button>
  )
}
