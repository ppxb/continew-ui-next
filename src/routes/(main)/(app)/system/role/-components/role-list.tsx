import * as React from 'react'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { type ColumnVisibilityState, type PaginationState, useTable } from '@tanstack/react-table'

import { Plus } from 'lucide-react'

import { DataTable } from '@/components/data-table'
import { ListPageCard } from '@/components/list-page-card'
import { TableSearch } from '@/components/table-search'
import { TableToolbar } from '@/components/table-toolbar'
import { Button } from '@/components/ui/button'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'
import { usePageClamp } from '@/hooks/use-page-clamp'
import { listRoles, roleKeys, type RoleResp } from '@/lib/api/role'
import { dataTableFeatures } from '@/lib/data-table-features'

import { createRoleColumns, type RoleAction } from './role-columns'
import { RoleDeleteDialog } from './role-delete-dialog'
import { RoleFormDrawer } from './role-form-drawer'
import { RolePermissionDrawer } from './role-permission-drawer'
import { RoleUserDrawer } from './role-user-drawer'

const HIDDEN_BY_DEFAULT: ColumnVisibilityState = {
  createUserString: false,
  updateUserString: false,
  updateTime: false
}

const DEFAULT_SORT = 'sort,asc,id,desc'
const EMPTY_ROWS: RoleResp[] = []

export function RoleList() {
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>(HIDDEN_BY_DEFAULT)
  const [keyword, setKeyword] = React.useState('')

  // Drawer & Dialog states
  const [formRoleId, setFormRoleId] = React.useState<string | number | null>(null)
  const [isFormOpen, setIsFormOpen] = React.useState(false)

  const [permissionRole, setPermissionRole] = React.useState<RoleResp | null>(null)
  const [isPermissionOpen, setIsPermissionOpen] = React.useState(false)

  const [userRole, setUserRole] = React.useState<RoleResp | null>(null)
  const [isUserOpen, setIsUserOpen] = React.useState(false)

  const [deletingRole, setDeletingRole] = React.useState<RoleResp | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)

  const fullscreen = useFullscreenTransition()

  const queryParams = { description: keyword || undefined, sort: DEFAULT_SORT }

  const query = useQuery({
    queryKey: roleKeys.list(queryParams),
    queryFn: ({ signal }) => listRoles(queryParams, signal),
    placeholderData: keepPreviousData
  })

  const roles = query.data ?? EMPTY_ROWS
  const rowOffset = pagination.pageIndex * pagination.pageSize

  usePageClamp(roles.length, pagination, setPagination)

  const handleSearch = (next: string) => {
    setKeyword(next)
    setPagination(current => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
  }

  const handleRowAction = React.useCallback((action: RoleAction, role: RoleResp) => {
    if (action === 'edit') {
      setFormRoleId(role.id)
      setIsFormOpen(true)
      return
    }

    if (action === 'permission') {
      setPermissionRole(role)
      setIsPermissionOpen(true)
      return
    }

    if (action === 'members') {
      setUserRole(role)
      setIsUserOpen(true)
      return
    }

    if (action === 'delete') {
      setDeletingRole(role)
      setIsDeleteOpen(true)
    }
  }, [])

  const columns = React.useMemo(() => createRoleColumns(handleRowAction, rowOffset), [handleRowAction, rowOffset])

  const table = useTable({
    features: dataTableFeatures,
    data: roles,
    columns,
    state: { columnVisibility, pagination },
    autoResetPageIndex: false,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getRowId: row => String(row.id)
  })

  const handleCreate = () => {
    setFormRoleId(null)
    setIsFormOpen(true)
  }

  const filters = <TableSearch className="h-8" placeholder="搜索角色名称、编码" onSearch={handleSearch} />

  const actions = (
    <TableToolbar
      table={table}
      isRefreshing={query.isFetching && !query.isPending}
      isFullscreen={fullscreen.isFullscreen}
      onRefresh={() => void query.refetch()}
      onToggleFullscreen={fullscreen.toggleFullscreen}
      onResetColumns={() => setColumnVisibility(HIDDEN_BY_DEFAULT)}
      actions={
        <Button onClick={handleCreate}>
          <Plus />
          新增角色
        </Button>
      }
    />
  )

  return (
    <>
      <ListPageCard
        title="角色管理"
        description="管理系统角色、数据权限范围及角色成员关联"
        filters={filters}
        actions={actions}
        fullscreen={fullscreen}
      >
        <DataTable
          table={table}
          isLoading={query.isPending}
          isError={query.isError}
          isShowingPreviousRows={query.isPlaceholderData}
          onRetry={() => void query.refetch()}
          skeletonWidths={['mx-auto w-4', 'mx-auto w-6', 'w-24', 'w-20', 'mx-auto w-16 rounded-full', 'w-20']}
        />
      </ListPageCard>

      {/* Add / Edit Drawer */}
      <RoleFormDrawer roleId={formRoleId} open={isFormOpen} onClose={() => setIsFormOpen(false)} />

      {/* Functional Permission Tree Drawer */}
      <RolePermissionDrawer role={permissionRole} open={isPermissionOpen} onClose={() => setIsPermissionOpen(false)} />

      {/* Member Management Drawer */}
      <RoleUserDrawer role={userRole} open={isUserOpen} onClose={() => setIsUserOpen(false)} />

      {/* Delete Confirmation Dialog */}
      <RoleDeleteDialog role={deletingRole} open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} />
    </>
  )
}
