import * as React from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'

import { ProTable } from '@/components/pro'
import { Button } from '@/components/ui/button'
import { usePermission } from '@/hooks/use-permission'
import { listRoles, roleKeys, type RoleResp } from '@/lib/api/role'

import { createRoleColumns, type RoleAction, type RoleEntity } from './role-columns'
import { RoleDeleteDialog } from './role-delete-dialog'
import { RoleDetailDrawer } from './role-detail-drawer'
import { RoleFormDrawer } from './role-form-drawer'
import { RolePermissionDrawer } from './role-permission-drawer'
import { RoleUserDrawer } from './role-user-drawer'

const HIDDEN_BY_DEFAULT = { createUserString: { show: false }, updateUserString: { show: false }, updateTime: { show: false } }
const DEFAULT_SORT = 'sort,asc,id,desc'
const EMPTY_ROWS: RoleResp[] = []

export function RoleList() {
  const { hasPermission } = usePermission()
  const canCreate = hasPermission('system:role:create')
  const canGet = hasPermission('system:role:get')
  const canUpdate = hasPermission('system:role:update')
  const canUpdatePermission = hasPermission('system:role:updatePermission')
  const canDelete = hasPermission('system:role:delete')
  const [keyword, setKeyword] = React.useState('')
  const [detailRoleId, setDetailRoleId] = React.useState<string | number | null>(null)
  const [formTarget, setFormTarget] = React.useState<{ roleId: string | number | null } | null>(null)
  const [permissionRole, setPermissionRole] = React.useState<RoleResp | null>(null)
  const [userRole, setUserRole] = React.useState<RoleResp | null>(null)
  const [deletingRole, setDeletingRole] = React.useState<RoleResp | null>(null)
  const queryParams = { description: keyword || undefined, sort: DEFAULT_SORT }
  const query = useQuery({
    queryKey: roleKeys.list(queryParams), queryFn: ({ signal }) => listRoles(queryParams, signal), placeholderData: keepPreviousData
  })
  const handleRowAction = React.useCallback((action: RoleAction, role: RoleResp) => {
    if (action === 'detail') setDetailRoleId(role.id)
    else if (action === 'edit') setFormTarget({ roleId: role.id })
    else if (action === 'permission') setPermissionRole(role)
    else if (action === 'members') setUserRole(role)
    else setDeletingRole(role)
  }, [])
  const columns = React.useMemo(
    () => createRoleColumns(handleRowAction, { canGet, canUpdate, canUpdatePermission, canDelete }),
    [handleRowAction, canGet, canUpdate, canUpdatePermission, canDelete]
  )

  return <>
    <ProTable<RoleEntity> columns={columns} rowKey="id" dataSource={query.data ?? EMPTY_ROWS} queryKey={roleKeys.lists()}
      params={queryParams} loading={query.isPending || query.isFetching} isError={query.isError} isShowingPreviousRows={query.isPlaceholderData}
      headerTitle="角色管理" toolbar={{ subTitle: '管理系统角色、数据权限范围及关联角色' }} columnsState={{ defaultValue: HIDDEN_BY_DEFAULT }}
      options={{ search: { placeholder: '搜索角色名称、编码', onSearch: next => { setKeyword(next); return false } } }}
      toolBarRender={() => canCreate ? [<Button key="create" onClick={() => setFormTarget({ roleId: null })}><Plus />新增角色</Button>] : []}
    />
    <RoleDetailDrawer roleId={detailRoleId} open={detailRoleId !== null} onClose={() => setDetailRoleId(null)} />
    <RoleFormDrawer roleId={formTarget?.roleId ?? null} open={formTarget !== null} onClose={() => setFormTarget(null)} />
    <RolePermissionDrawer role={permissionRole} open={permissionRole !== null} onClose={() => setPermissionRole(null)} />
    <RoleUserDrawer role={userRole} open={userRole !== null} onClose={() => setUserRole(null)} />
    <RoleDeleteDialog role={deletingRole} open={deletingRole !== null} onClose={() => setDeletingRole(null)} />
  </>
}
