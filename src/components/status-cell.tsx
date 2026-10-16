import { Badge } from '@/components/ui/badge'

/**
 * The 启用/禁用 badge shown by every list screen.
 *
 * The user, app and client screens each carried a byte-identical copy, and the department, menu
 * and role screens borrowed one of them across route directories.
 */
export function StatusCell({ status }: { status?: number | null }) {
  const isEnabled = status === 1

  return (
    <Badge variant="secondary">
      <span className={isEnabled ? 'size-1.5 rounded-full bg-green-600' : 'size-1.5 rounded-full bg-destructive'} />
      {isEnabled ? '启用' : '禁用'}
    </Badge>
  )
}
