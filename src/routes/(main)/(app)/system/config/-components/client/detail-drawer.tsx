import { Smartphone } from 'lucide-react'

import { EntityDrawer } from '@/components/entity-drawer'
import { ProDescriptions, type ProColumns } from '@/components/pro'
import { useLastRecord } from '@/hooks/use-last-record'
import type { ClientResp } from '@/lib/api/client'

interface ClientDetailDrawerProps {
  readonly client: ClientResp | null
  readonly open: boolean
  readonly columns: readonly ProColumns<ClientResp>[]
  readonly onClose: () => void
}

export function ClientDetailDrawer({
  client,
  open,
  columns,
  onClose
}: ClientDetailDrawerProps) {
  // Keep the last client during the close animation, where `client` is already null.
  const detail = useLastRecord(client)

  return (
    // Keep the Drawer mounted while closed so the first open still plays its enter transition; guard the body instead.
    <EntityDrawer open={open} onClose={onClose} title="客户端详情" icon={<Smartphone className="size-4" />} width={32}>
      {detail ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          <ProDescriptions columns={columns} dataSource={detail} />
        </div>
      ) : null}
    </EntityDrawer>
  )
}
