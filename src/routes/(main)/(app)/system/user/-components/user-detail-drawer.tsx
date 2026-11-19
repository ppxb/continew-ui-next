import { Eye } from 'lucide-react'

import { EntityDrawer } from '@/components/entity-drawer'
import { ProDescriptions } from '@/components/pro'
import { QueryState } from '@/components/query-state'
import { useLastRecord } from '@/hooks/use-last-record'

import { userColumns, type UserRecord } from './user-columns'
import { useUserDetail } from './use-user-detail'

interface UserDetailDrawerProps {
  /** The user to show, or `null` before the first one is picked. */
  readonly userId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

export function UserDetailDrawer({ userId, open, onClose }: UserDetailDrawerProps) {
  // The read-only drawer can reuse the short detail cache; edit and role flows force a fresh read.
  const query = useUserDetail(userId, { enabled: open })

  // Keep the last detail during the close animation; the query key becomes null first.
  const lastDetail = useLastRecord(query.data ?? null)
  const detail = query.data ?? (open ? null : lastDetail)

  return (
    <EntityDrawer open={open} onClose={onClose} title="用户详情" icon={<Eye className="size-4" />} width={32}>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        {query.isError || (!detail && !query.isPending) ? (
          <QueryState state="error" onRetry={() => void query.refetch()} />
        ) : (
          <ProDescriptions<UserRecord>
            columns={userColumns}
            dataSource={detail ?? undefined}
            loading={!detail && query.isPending}
          />
        )}
      </div>
    </EntityDrawer>
  )
}
