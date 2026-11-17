import { LayoutGrid } from 'lucide-react'

import { EntityDrawer } from '@/components/entity-drawer'
import { ProDescriptions } from '@/components/pro'
import { QueryState } from '@/components/query-state'
import { useLastRecord } from '@/hooks/use-last-record'

import { appColumns } from './app-columns'
import { useAppDetail } from './use-app-detail'


interface AppDetailDrawerProps {
  /** The app to show, or `null` before the first one is picked. */
  readonly appId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

/** Read-only app detail panel. */
export function AppDetailDrawer({ appId, open, onClose }: AppDetailDrawerProps) {
  const query = useAppDetail(appId, { enabled: open })

  // Keep the last detail during the close animation; the query key becomes null first.
  const lastDetail = useLastRecord(query.data ?? null)
  const detail = query.data ?? (open ? null : lastDetail)

  return (
    <EntityDrawer open={open} onClose={onClose} title="应用详情" icon={<LayoutGrid className="size-4" />} width={32}>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        {query.isError ? (
          <QueryState state="error" onRetry={() => void query.refetch()} />
        ) : (
          <ProDescriptions columns={appColumns} dataSource={detail ?? undefined} loading={!detail && query.isPending} />
        )}
      </div>
    </EntityDrawer>
  )
}
