import { useQueryClient } from '@tanstack/react-query'
import { LayoutGrid } from 'lucide-react'

import { BetaSchemaForm } from '@/components/pro'
import { toast } from '@/components/ui/toast'
import { appKeys, createApp, getApp, type AppResp, updateApp } from '@/lib/api/app'

import { appColumns } from './app-columns'

interface AppFormDrawerProps {
  readonly appId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

export function AppFormDrawer({ appId, open, onClose }: AppFormDrawerProps) {
  const queryClient = useQueryClient()
  return (
    <BetaSchemaForm<AppResp, typeof appColumns>
      layoutType="DrawerForm"
      title={appId === null ? '新增应用' : '修改应用'}
      width={30}
      drawerProps={{ icon: <LayoutGrid className="size-4" /> }}
      open={open}
      onOpenChange={next => { if (!next) onClose() }}
      columns={appColumns}
      queryKey={appKeys.detail(appId)}
      request={appId === null ? undefined : (_params, signal) => getApp(appId, signal)}
      onFinish={async values => {
        if (appId === null) await createApp(values)
        else await updateApp(appId, values)
        void queryClient.invalidateQueries({ queryKey: appKeys.all })
        toast.add({ title: appId === null ? '新增应用成功' : '修改应用成功', type: 'success' })
        return true
      }}
    />
  )
}
