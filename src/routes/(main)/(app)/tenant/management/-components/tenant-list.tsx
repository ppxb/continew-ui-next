import * as React from 'react'

import { Plus } from 'lucide-react'

import { ProTable } from '@/components/pro'
import { Button } from '@/components/ui/button'
import { usePermission } from '@/hooks/use-permission'
import { listTenants, tenantKeys, type TenantPageQuery, type TenantResp } from '@/lib/api/tenant'

import { createTenantColumns, type TenantAction, type TenantRecord } from './tenant-columns'
import { TenantAdminPasswordDialog } from './tenant-admin-password-dialog'
import { TenantDeleteDialog } from './tenant-delete-dialog'
import { TenantDetailDrawer } from './tenant-detail-drawer'
import { TenantFormDrawer } from './tenant-form-drawer'

/** Newest first; the tenant table has no alias in its queries. */
const DEFAULT_SORT = 'createTime,desc'

const HIDDEN_BY_DEFAULT = {
  createUserString: { show: false },
  updateUserString: { show: false },
  updateTime: { show: false }
}

export function TenantList() {
  const { hasPermission } = usePermission()
  const canCreate = hasPermission('tenant:management:create')
  const canGet = hasPermission('tenant:management:get')
  const canUpdate = hasPermission('tenant:management:update')
  const canDelete = hasPermission('tenant:management:delete')
  const canUpdateAdminPassword = hasPermission('tenant:management:updateAdminUserPwd')
  const [detailId, setDetailId] = React.useState<string | number | null>(null)
  const [formTarget, setFormTarget] = React.useState<{ tenantId: string | number | null } | null>(null)
  const [passwordTenant, setPasswordTenant] = React.useState<TenantResp | null>(null)
  const [deletingTenant, setDeletingTenant] = React.useState<TenantResp | null>(null)

  const handleAction = React.useCallback((action: TenantAction, tenant: TenantResp) => {
    if (action === 'detail') {
      setDetailId(tenant.id)
      return
    }
    if (action === 'edit') {
      setFormTarget({ tenantId: tenant.id })
      return
    }
    if (action === 'adminPassword') {
      setPasswordTenant(tenant)
      return
    }
    setDeletingTenant(tenant)
  }, [])

  const columns = React.useMemo(
    () => createTenantColumns({ canGet, canUpdate, canUpdateAdminPassword, canDelete, onAction: handleAction }),
    [canGet, canUpdate, canUpdateAdminPassword, canDelete, handleAction]
  )

  return (
    <>
      <ProTable<TenantRecord, Omit<TenantPageQuery, 'page' | 'size'>>
        headerTitle="租户管理"
        toolbar={{ subTitle: '管理租户、套餐关联与租户管理员账号' }}
        rowKey="id"
        columns={columns}
        queryKey={tenantKeys.lists()}
        options={{ search: { name: 'description', placeholder: '搜索名称、描述' } }}
        columnsState={{ defaultValue: HIDDEN_BY_DEFAULT }}
        request={async ({ current, pageSize, ...search }, _sort, _filter, signal) => {
          const page = await listTenants({ ...search, page: current, size: pageSize, sort: DEFAULT_SORT }, signal)
          return { data: page.list, total: page.total }
        }}
        toolBarRender={() =>
          canCreate
            ? [
                <Button key="create" onClick={() => setFormTarget({ tenantId: null })}>
                  <Plus />
                  新增租户
                </Button>
              ]
            : []
        }
      />

      <TenantDetailDrawer tenantId={detailId} open={detailId !== null} onClose={() => setDetailId(null)} />
      <TenantFormDrawer
        tenantId={formTarget?.tenantId ?? null}
        open={formTarget !== null}
        onClose={() => setFormTarget(null)}
      />
      <TenantAdminPasswordDialog
        tenant={passwordTenant}
        open={passwordTenant !== null}
        onClose={() => setPasswordTenant(null)}
      />
      <TenantDeleteDialog
        tenant={deletingTenant}
        open={deletingTenant !== null}
        onClose={() => setDeletingTenant(null)}
      />
    </>
  )
}
