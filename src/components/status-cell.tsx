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

/** The 成功/失败 badge shared by the log screens. */
export function SuccessFailureCell({ status }: { status?: number | null }) {
  const isSuccess = status === 1

  return (
    <Badge variant={isSuccess ? 'secondary' : 'destructive'}>
      <span className={isSuccess ? 'size-1.5 rounded-full bg-green-600' : 'size-1.5 rounded-full bg-destructive'} />
      {isSuccess ? '成功' : '失败'}
    </Badge>
  )
}
