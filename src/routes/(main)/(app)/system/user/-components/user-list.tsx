import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { type ColumnVisibilityState, type PaginationState, useTable } from '@tanstack/react-table'
import { cn } from 'cn'
import { DataTable } from '@/components/data-table'
import { TableSearch } from '@/components/table-search'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
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
import { UserToolbar } from './user-toolbar'

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
  const [isExporting, setIsExporting] = React.useState(false)
  // One state per overlay: a null value means it is closed, so "which record" and "is it open" can
  // never drift apart. The form drawer holds an object, because a null id there means 新增.
  const [detailUserId, setDetailUserId] = React.useState<string | number | null>(null)
  const [formTarget, setFormTarget] = React.useState<{ userId: string | number | null } | null>(null)
  const [resetUser, setResetUser] = React.useState<UserResp | null>(null)
  const [roleUser, setRoleUser] = React.useState<UserResp | null>(null)
  const [deletingUser, setDeletingUser] = React.useState<UserResp | null>(null)
  const { isFullscreen, reservedHeight, fullscreenRef, spacerRef, toggleFullscreen } = useFullscreenTransition()

  const handleSearch = React.useCallback((next: string) => {
    setKeyword(next)
    setPagination(current => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
  }, [])

  const filters = { status, deptId, description: keyword || undefined, sort: DEFAULT_SORT }
  const params = { page: pagination.pageIndex + 1, size: pagination.pageSize, ...filters }

  const query = useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => listUsers(params),
    placeholderData: previous => previous
  })

  useQuery({
    queryKey: deptKeys.trees(),
    queryFn: getDeptTree,
    staleTime: 5 * 60_000
  })

  useQuery({
    queryKey: roleKeys.dicts(),
    queryFn: listRoleDict,
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

  const reportPending = React.useCallback((label: string) => {
    toast.add({ title: `${label}功能开发中`, type: 'info' })
  }, [])

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
    setDeptId(value ? value : undefined)
    setPagination(current => ({ ...current, pageIndex: 0 }))
  }

  const handleStatusChange = (value: string | null) => {
    setStatus(!value || value === 'all' ? undefined : (Number(value) as UserStatus))
    setPagination(current => ({ ...current, pageIndex: 0 }))
  }

  const handleExport = async () => {
    setIsExporting(true)

    try {
      await exportUsers(filters)
      toast.add({ title: '导出已开始，请留意浏览器下载', type: 'success' })
    } catch {
      // The HTTP layer already reported the failure.
    } finally {
      setIsExporting(false)
    }
  }

  const tableSection = (
    <>
      <div className="flex flex-col gap-3 px-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
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
          <div className="w-full sm:w-32">
            <Select
              items={STATUS_OPTIONS}
              value={status === undefined ? 'all' : String(status)}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-full">
                <span className="text-muted-foreground">状态</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                <SelectGroup>
                  {STATUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <UserToolbar
          table={table}
          isRefreshing={query.isFetching && !query.isPending}
          isExporting={isExporting}
          isFullscreen={isFullscreen}
          onCreate={() => setFormTarget({ userId: null })}
          onImport={() => reportPending('导入数据')}
          onExport={() => void handleExport()}
          onRefresh={() => void query.refetch()}
          onToggleFullscreen={toggleFullscreen}
          onResetColumns={() => setColumnVisibility(HIDDEN_BY_DEFAULT)}
        />
      </div>

      <DataTable
        table={table}
        isLoading={query.isPending}
        isError={query.isError}
        isShowingPreviousRows={query.isPlaceholderData}
        onRetry={() => void query.refetch()}
        skeletonWidths={['mx-auto w-6', 'w-24', 'w-20', 'mx-auto w-12 rounded-full', 'mx-auto w-8', 'w-12']}
      />
    </>
  )

  return (
    <>
      <Card className="pb-0">
        <CardHeader>
          <CardTitle className="text-xl">用户管理</CardTitle>
          <CardDescription>维护系统用户，查看用户的基本信息</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 px-0">
          {isFullscreen ? <div ref={spacerRef} style={{ height: reservedHeight }} /> : null}

          <div ref={fullscreenRef} className={cn('flex flex-col gap-4', isFullscreen && 'bg-background')}>
            {tableSection}
          </div>
        </CardContent>
      </Card>

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
