import { Building2 } from 'lucide-react'

import { EntityDrawer } from '@/components/entity-drawer'
import { ProDescriptions } from '@/components/pro'
import { QueryState } from '@/components/query-state'
import { useLastRecord } from '@/hooks/use-last-record'

import { tenantColumns, type TenantRecord } from './tenant-columns'
import { useTenantDetail } from './use-tenant-detail'

interface TenantDetailDrawerProps {
  /** The tenant to show, or `null` before the first one is picked. */
  readonly tenantId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

/** Read-only detail panel for one tenant. */
export function TenantDetailDrawer({ tenantId, open, onClose }: TenantDetailDrawerProps) {
  const query = useTenantDetail(tenantId, { enabled: open })

  // Keep the last detail during the close animation; the query key becomes null first.
  const lastDetail = useLastRecord(query.data ?? null)
  const detail = query.data ?? (open ? null : lastDetail)

  return (
    <EntityDrawer open={open} onClose={onClose} title="租户详情" icon={<Building2 className="size-4" />} width={36}>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        {query.isError || (!detail && !query.isPending) ? (
          <QueryState state="error" onRetry={() => void query.refetch()} />
        ) : (
          <ProDescriptions<TenantRecord>
            columns={tenantColumns}
            dataSource={detail ?? undefined}
            loading={!detail && query.isPending}
          />
        )}
      </div>
    </EntityDrawer>
  )
}
