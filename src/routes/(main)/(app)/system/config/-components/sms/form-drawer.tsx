import { useQueryClient } from '@tanstack/react-query'
import { MessageSquare } from 'lucide-react'

import { BetaSchemaForm, type ProColumns } from '@/components/pro'
import { toast } from '@/components/ui/toast'
import { createSmsConfig, getSmsConfig, type SmsConfigResp, updateSmsConfig } from '@/lib/api/sms'
import { smsKeys } from '@/lib/query-keys'

import { toSmsPayload, type SmsSubmitValues } from './columns'

interface SmsFormDrawerProps {
  readonly smsId: string | number | null
  readonly open: boolean
  readonly columns: readonly ProColumns<SmsConfigResp>[]
  readonly onClose: () => void
}

export function SmsFormDrawer({ smsId, open, columns, onClose }: SmsFormDrawerProps) {
  const queryClient = useQueryClient()
  const isEdit = smsId !== null
  return (
    <BetaSchemaForm<SmsConfigResp>
      layoutType="DrawerForm"
      title={isEdit ? '修改短信配置' : '新增短信配置'}
      width={32}
      grid
      drawerProps={{ icon: <MessageSquare className="size-4" /> }}
      open={open}
      onOpenChange={next => { if (!next) onClose() }}
      columns={columns}
      queryKey={smsKeys.detail(smsId ?? '')}
      request={smsId === null ? undefined : (_params, signal) => getSmsConfig(smsId, signal)}
      onFinish={async values => {
        const payload = toSmsPayload(values as SmsSubmitValues)
        try {
          if (smsId === null) await createSmsConfig(payload)
          else await updateSmsConfig(smsId, payload)
        } catch {
          // The HTTP layer already reported the failure.
          return false
        }
        toast.add({ title: isEdit ? '修改短信配置成功' : '新增短信配置成功', type: 'success' })
        void queryClient.invalidateQueries({ queryKey: smsKeys.all })
        return true
      }}
    />
  )
}
