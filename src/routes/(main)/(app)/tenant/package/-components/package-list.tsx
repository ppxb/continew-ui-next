import * as React from 'react'

import { ProTable } from '@/components/pro'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { usePermission } from '@/hooks/use-permission'
import {
  listPackages,
  packageKeys,
  type PackagePageQuery,
  type PackageResp
} from '@/lib/api/package'

import { createPackageColumns, type PackageAction, type PackageRecord } from './package-columns'
import { PackageDeleteDialog } from './package-delete-dialog'
import { PackageDetailDrawer } from './package-detail-drawer'
import { PackageFormDrawer } from './package-form-drawer'

/** Newest first; the package table has no alias in its queries. */
const DEFAULT_SORT = 'createTime,desc'

const HIDDEN_BY_DEFAULT = {
  createUserString: { show: false },
  updateUserString: { show: false },
  updateTime: { show: false }
}

export function PackageList() {
  const { hasPermission } = usePermission()
  const canCreate = hasPermission('tenant:package:create')
  const canGet = hasPermission('tenant:package:get')
  const canUpdate = hasPermission('tenant:package:update')
  const canDelete = hasPermission('tenant:package:delete')
  // One state per overlay: a null value means it is closed. The form drawer holds an object,
  // because a null id there means 新增.
  const [detailId, setDetailId] = React.useState<string | number | null>(null)
  const [formTarget, setFormTarget] = React.useState<{ packageId: string | number | null } | null>(null)
  const [deletingPackage, setDeletingPackage] = React.useState<PackageResp | null>(null)

  const handleAction = React.useCallback((action: PackageAction, pkg: PackageResp) => {
    if (action === 'detail') {
      setDetailId(pkg.id)
      return
    }

    if (action === 'edit') {
      setFormTarget({ packageId: pkg.id })
      return
    }

    setDeletingPackage(pkg)
  }, [])

  const columns = React.useMemo(
    () => createPackageColumns({ canGet, canUpdate, canDelete, onAction: handleAction }),
    [canGet, canUpdate, canDelete, handleAction]
  )

  return (
    <>
      <ProTable<PackageRecord, Omit<PackagePageQuery, 'page' | 'size'>>
        headerTitle="套餐管理"
        toolbar={{ subTitle: '管理租户可用的套餐与菜单授权' }}
        columns={columns}
        rowKey="id"
        queryKey={packageKeys.lists()}
        columnsState={{ defaultValue: HIDDEN_BY_DEFAULT }}
        options={{ search: { name: 'description', placeholder: '搜索名称、描述' } }}
        request={async ({ current, pageSize, description, status }, _sort, _filter, signal) => {
          const page = await listPackages({ page: current, size: pageSize, sort: DEFAULT_SORT, description: description || undefined, status }, signal)
          return { data: page.list, total: page.total }
        }}
        toolBarRender={() => canCreate ? [<Button key="create" onClick={() => setFormTarget({ packageId: null })}><Plus />新增套餐</Button>] : []}
      />

      <PackageDetailDrawer packageId={detailId} open={detailId !== null} onClose={() => setDetailId(null)} />
      <PackageFormDrawer
        packageId={formTarget?.packageId ?? null}
        open={formTarget !== null}
        onClose={() => setFormTarget(null)}
      />
      <PackageDeleteDialog
        pkg={deletingPackage}
        open={deletingPackage !== null}
        onClose={() => setDeletingPackage(null)}
      />
    </>
  )
}
