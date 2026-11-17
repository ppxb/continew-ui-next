import { useQueryClient } from '@tanstack/react-query'
import { Smartphone } from 'lucide-react'

import { BetaSchemaForm, type ProColumns } from '@/components/pro'
import { toast } from '@/components/ui/toast'
import { createClient, getClient, updateClient, type ClientResp } from '@/lib/api/client'
import { clientKeys } from '@/lib/query-keys'

import { toClientPayload, type ClientSubmitValues } from './columns'

interface ClientFormDrawerProps {
  readonly clientId: string | number | null
  readonly open: boolean
  readonly columns: readonly ProColumns<ClientResp>[]
  readonly onClose: () => void
}

export function ClientFormDrawer({ clientId, open, columns, onClose }: ClientFormDrawerProps) {
  const queryClient = useQueryClient()
  const isEdit = clientId !== null
  return (
    <BetaSchemaForm<ClientResp>
      layoutType="DrawerForm"
      title={isEdit ? '修改客户端' : '新增客户端'}
      width={36}
      grid
      drawerProps={{ icon: <Smartphone className="size-4" /> }}
      open={open}
      onOpenChange={next => { if (!next) onClose() }}
      columns={columns}
      queryKey={clientKeys.detail(clientId ?? '')}
      request={clientId === null ? undefined : (_params, signal) => getClient(clientId, signal)}
      onFinish={async values => {
        const payload = toClientPayload(values as ClientSubmitValues)
        try {
          if (clientId === null) await createClient(payload)
          else await updateClient(clientId, payload)
        } catch {
          // The HTTP layer already reported the failure.
          return false
        }
        toast.add({ title: isEdit ? '修改客户端成功' : '新增客户端成功', type: 'success' })
        void queryClient.invalidateQueries({ queryKey: clientKeys.all })
        return true
      }}
    />
  )
}
