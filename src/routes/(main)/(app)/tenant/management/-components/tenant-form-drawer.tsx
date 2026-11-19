import { useMemo } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'

import { BetaSchemaForm } from '@/components/pro'
import { toast } from '@/components/ui/toast'
import { listPackageDict, packageKeys } from '@/lib/api/package'
import { createTenant, getTenant, tenantKeys, updateTenant } from '@/lib/api/tenant'
import { encryptByRsa } from '@/lib/crypto'

import { getTenantFormColumns, type TenantRecord } from './tenant-columns'
import { getTenantCredentials, toTenantRequest } from './tenant-form-values'

interface TenantFormDrawerProps {
  readonly tenantId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

export function TenantFormDrawer({ tenantId, open, onClose }: TenantFormDrawerProps) {
  const queryClient = useQueryClient()
  const isCreate = tenantId === null
  const columns = useMemo(() => getTenantFormColumns(isCreate), [isCreate])
  const packages = useQuery({
    queryKey: packageKeys.dicts(),
    queryFn: ({ signal }) => listPackageDict(signal),
    enabled: open
  })

  return (
    <BetaSchemaForm<TenantRecord>
      layoutType="DrawerForm"
      title={isCreate ? '新增租户' : '修改租户'}
      width={32}
      drawerProps={{ icon: <Building2 className="size-4" /> }}
      open={open}
      onOpenChange={next => {
        if (!next) onClose()
      }}
      columns={columns}
      queryKey={tenantKeys.detail(tenantId)}
      request={tenantId === null ? undefined : (_params, signal) => getTenant(tenantId, signal)}
      onFinish={async values => {
        const body = toTenantRequest(values, packages.data ?? [])
        if (tenantId === null) {
          const credentials = getTenantCredentials(values)
          let adminPassword: string
          try {
            adminPassword = encryptByRsa(credentials.adminPassword)
          } catch {
            toast.add({ title: '密码加密失败，请刷新页面后重试', type: 'error' })
            return false
          }
          try {
            await createTenant({ ...body, adminUsername: credentials.adminUsername, adminPassword })
          } catch {
            return false
          }
        } else {
          try {
            await updateTenant(tenantId, body)
          } catch {
            return false
          }
        }
        void queryClient.invalidateQueries({ queryKey: tenantKeys.all })
        toast.add({ title: isCreate ? '新增成功' : '修改成功', type: 'success' })
        return true
      }}
    />
  )
}
