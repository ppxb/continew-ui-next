import * as React from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { type ColumnVisibilityState, type PaginationState, useTable } from '@tanstack/react-table'
import { Download, Plus, Upload } from 'lucide-react'
import { DataTable } from '@/components/data-table'
import { FilterSelect } from '@/components/filter-select'
import { ListPageCard } from '@/components/list-page-card'
import { TableSearch } from '@/components/table-search'
import { TableToolbar } from '@/components/table-toolbar'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { useExport } from '@/hooks/use-export'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'
import { deptKeys, getDeptTree } from '@/lib/api/dept'
import { listRoleDict, roleKeys } from '@/lib/api/role'
import { exportUsers, listUsers, userKeys, type UserResp, type UserStatus } from '@/lib/api/user'
import { dataTableFeatures } from '@/lib/data-table-features'

import { DeptTreeSelect } from './dept-tree-select'
import { UserAssignRolesDialog } from './user-assign-roles-dialog'
import { createUserColumns, type UserAction } from './user-columns'
import { UserDeleteDialog } from './user-delete-dialog'
import { UserDetailDrawer } from './user-detail-drawer'
import { UserFormDrawer } from './user-form-drawer'
import { UserResetPasswordDialog } from './user-reset-password-dialog'

const HIDDEN_BY_DEFAULT: ColumnVisibilityState = {
  isSystem: false,
  createUserString: false,
  updateUserString: false,
  updateTime: false
}

/** The user query sorts on its own `t1` table alias. */
const DEFAULT_SORT = 't1.id,desc'

const EMPTY_ROWS: UserResp[] = []

const STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: '1', label: '启用' },
  { value: '2', label: '禁用' }
]

export function UserList() {
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>(HIDDEN_BY_DEFAULT)
  const [deptId, setDeptId] = React.useState<string | number | undefined>(undefined)
  const [status, setStatus] = React.useState<UserStatus | undefined>(undefined)
  const [keyword, setKeyword] = React.useState('')
  // One state per overlay: a null value means it is closed, so "which record" and "is it open" can
  // never drift apart. The form drawer holds an object, because a null id there means 新增.
  const [detailUserId, setDetailUserId] = React.useState<string | number | null>(null)
  const [formTarget, setFormTarget] = React.useState<{ userId: string | number | null } | null>(null)
  const [resetUser, setResetUser] = React.useState<UserResp | null>(null)
  const [roleUser, setRoleUser] = React.useState<UserResp | null>(null)
  const [deletingUser, setDeletingUser] = React.useState<UserResp | null>(null)
  const fullscreen = useFullscreenTransition()
  const { isExporting, exportData } = useExport(exportUsers)

  const resetPage = React.useCallback(() => {
    setPagination(current => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
  }, [])

  const handleSearch = React.useCallback(
    (next: string) => {
      setKeyword(next)
      resetPage()
    },
    [resetPage]
  )

  const queryFilters = { status, deptId, description: keyword || undefined, sort: DEFAULT_SORT }
  const params = { page: pagination.pageIndex + 1, size: pagination.pageSize, ...queryFilters }

  const query = useQuery({
    queryKey: userKeys.list(params),
    queryFn: ({ signal }) => listUsers(params, signal),
    placeholderData: keepPreviousData
  })

  useQuery({
    queryKey: deptKeys.trees(),
    queryFn: ({ signal }) => getDeptTree(undefined, signal),
    staleTime: 5 * 60_000
  })

  useQuery({
    queryKey: roleKeys.dicts(),
    queryFn: ({ signal }) => listRoleDict(signal),
    staleTime: 5 * 60_000
  })

  const total = query.data?.total ?? 0
  const rowOffset = pagination.pageIndex * pagination.pageSize

  React.useEffect(() => {
    if (total > 0 && pagination.pageIndex * pagination.pageSize >= total) {
      const maxPageIndex = Math.max(0, Math.ceil(total / pagination.pageSize) - 1)
      setPagination(current => ({ ...current, pageIndex: maxPageIndex }))
    }
  }, [total, pagination.pageIndex, pagination.pageSize])

  const handleRowAction = React.useCallback((action: UserAction, user: UserResp) => {
    if (action === 'detail') {
      setDetailUserId(user.id)
      return
    }

    if (action === 'edit') {
      setFormTarget({ userId: user.id })
      return
    }

    if (action === 'resetPassword') {
      setResetUser(user)
      return
    }

    if (action === 'assignRoles') {
      setRoleUser(user)
      return
    }

    setDeletingUser(user)
  }, [])

  const columns = React.useMemo(() => createUserColumns(handleRowAction, rowOffset), [handleRowAction, rowOffset])

  const table = useTable({
    features: dataTableFeatures,
    data: query.data?.list ?? EMPTY_ROWS,
    columns,
    state: { columnVisibility, pagination },
    manualPagination: true,
    rowCount: total,
    pageCount: Math.max(Math.ceil(total / pagination.pageSize), 1),
    autoResetPageIndex: false,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getRowId: row => String(row.id)
  })

  const handleDeptChange = (value: string) => {
    setDeptId(value || undefined)
    resetPage()
  }

  const handleStatusChange = (value: string | null) => {
    setStatus(!value || value === 'all' ? undefined : (Number(value) as UserStatus))
    resetPage()
  }

  const filters = (
    <>
      <TableSearch
        className="col-span-2 h-8 w-full sm:w-64"
        placeholder="搜索用户名、昵称、描述"
        onSearch={handleSearch}
      />
      <DeptTreeSelect
        triggerPrefix="部门"
        placeholder="全部"
        placeholderColor="foreground"
        showAllOption
        allOptionLabel="全部部门"
        value={deptId}
        onChange={handleDeptChange}
        className="w-full sm:w-44"
      />
      <FilterSelect
        label="状态"
        options={STATUS_OPTIONS}
        value={status === undefined ? 'all' : String(status)}
        onValueChange={handleStatusChange}
        className="w-full sm:w-32"
      />
    </>
  )

  const actions = (
    <TableToolbar
      table={table}
      className="w-full xl:w-auto xl:justify-end"
      isRefreshing={query.isFetching && !query.isPending}
      isFullscreen={fullscreen.isFullscreen}
      onRefresh={() => void query.refetch()}
      onToggleFullscreen={fullscreen.toggleFullscreen}
      onResetColumns={() => setColumnVisibility(HIDDEN_BY_DEFAULT)}
      actions={
        <>
          <Button className="w-full sm:w-auto" onClick={() => setFormTarget({ userId: null })}>
            <Plus />
            新增用户
          </Button>
          <Button variant="outline" onClick={() => toast.add({ title: '导入数据功能开发中', type: 'info' })}>
            <Upload />
            导入数据
          </Button>
          <Button variant="outline" disabled={isExporting} onClick={() => void exportData(queryFilters)}>
            {isExporting ? <Spinner /> : <Download />}
            导出
          </Button>
        </>
      }
    />
  )

  return (
    <>
      <ListPageCard
        title="用户管理"
        description="维护系统用户，查看用户的基本信息"
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
          skeletonWidths={['mx-auto w-6', 'w-24', 'w-20', 'mx-auto w-12 rounded-full', 'mx-auto w-8', 'w-12']}
        />
      </ListPageCard>

      <UserDetailDrawer userId={detailUserId} open={detailUserId !== null} onClose={() => setDetailUserId(null)} />
      <UserFormDrawer
        userId={formTarget?.userId ?? null}
        open={formTarget !== null}
        onClose={() => setFormTarget(null)}
      />
      <UserResetPasswordDialog user={resetUser} open={resetUser !== null} onClose={() => setResetUser(null)} />
      <UserAssignRolesDialog user={roleUser} open={roleUser !== null} onClose={() => setRoleUser(null)} />
      <UserDeleteDialog user={deletingUser} open={deletingUser !== null} onClose={() => setDeletingUser(null)} />
    </>
  )
}
