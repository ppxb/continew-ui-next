import * as React from 'react'

import { useQuery } from '@tanstack/react-query'
import { type ColumnVisibilityState, type PaginationState, useTable } from '@tanstack/react-table'

import { cn } from 'cn'
import { Search } from 'lucide-react'

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'
import { listRoles, roleKeys, type RoleResp } from '@/lib/api/role'
import { dataTableFeatures } from '@/lib/data-table-features'

import { createRoleColumns, type RoleAction } from './role-columns'
import { RoleDeleteDialog } from './role-delete-dialog'
import { RoleFormDrawer } from './role-form-drawer'
import { RolePermissionDrawer } from './role-permission-drawer'
import { RoleTable } from './role-table'
import { RoleToolbar } from './role-toolbar'
import { RoleUserDrawer } from './role-user-drawer'

const HIDDEN_BY_DEFAULT: ColumnVisibilityState = {
  createUserString: false,
  updateUserString: false,
  updateTime: false
}

const DEFAULT_SORT = 'sort,asc,id,desc'
const SEARCH_DEBOUNCE_MS = 300
const EMPTY_ROWS: RoleResp[] = []

export function RoleList() {
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>(HIDDEN_BY_DEFAULT)
  const [searchInput, setSearchInput] = React.useState('')
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

  const { isFullscreen, reservedHeight, fullscreenRef, spacerRef, toggleFullscreen } = useFullscreenTransition()

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(searchInput.trim())
      setPagination(current => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [searchInput])

  const query = useQuery({
    queryKey: roleKeys.list({
      description: keyword || undefined,
      sort: DEFAULT_SORT
    }),
    queryFn: () =>
      listRoles({
        description: keyword || undefined,
        sort: DEFAULT_SORT
      }),
    placeholderData: previous => previous
  })

  const roles = query.data ?? EMPTY_ROWS
  const total = roles.length
  const rowOffset = pagination.pageIndex * pagination.pageSize

  // Fallback pagination if total reduces out of bounds
  React.useEffect(() => {
    if (total > 0 && pagination.pageIndex * pagination.pageSize >= total) {
      const maxPageIndex = Math.max(0, Math.ceil(total / pagination.pageSize) - 1)
      setPagination(current => ({ ...current, pageIndex: maxPageIndex }))
    }
  }, [total, pagination.pageIndex, pagination.pageSize])

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

  const tableSection = (
    <>
      <RoleToolbar
        table={table}
        isRefreshing={query.isFetching}
        isFullscreen={isFullscreen}
        onCreate={handleCreate}
        onRefresh={() => void query.refetch()}
        onToggleFullscreen={toggleFullscreen}
        onResetColumns={() => setColumnVisibility(HIDDEN_BY_DEFAULT)}
      />

      <RoleTable
        table={table}
        isLoading={query.isPending}
        isError={query.isError}
        isStale={query.isPlaceholderData}
        onRetry={() => void query.refetch()}
      />
    </>
  )

  return (
    <>
      <Card>
        <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          <CardTitle className="text-xl leading-none">角色管理</CardTitle>
          <CardDescription className="max-w-sm leading-snug">管理系统角色、数据权限范围及角色成员关联</CardDescription>
          <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
            <InputGroup className="h-7 w-full md:w-64">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                className="h-7"
                placeholder="搜索角色名称、编码"
                value={searchInput}
                onChange={event => setSearchInput(event.target.value)}
              />
            </InputGroup>
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 px-0">
          {isFullscreen ? <div ref={spacerRef} style={{ height: reservedHeight }} /> : null}

          <div ref={fullscreenRef} className={cn('flex flex-col gap-4', isFullscreen && 'bg-background')}>
            {tableSection}
          </div>
        </CardContent>
      </Card>

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
