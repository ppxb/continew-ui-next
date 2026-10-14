import * as React from 'react'

import { useQuery } from '@tanstack/react-query'
import { type ColumnVisibilityState, type PaginationState, useTable } from '@tanstack/react-table'

import { cn } from 'cn'
import { Search } from 'lucide-react'

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { deptKeys, getDeptTree } from '@/lib/api/dept'
import { listRoleDict, roleKeys } from '@/lib/api/role'
import { exportUsers, listUsers, userKeys, type UserResp, type UserStatus } from '@/lib/api/user'
import { dataTableFeatures } from '@/lib/data-table-features'

import { useFullscreenTransition } from './use-fullscreen-transition'
import { UserAssignRolesDialog } from './user-assign-roles-dialog'
import { createUserColumns, type UserAction } from './user-columns'
import { UserDeleteDialog } from './user-delete-dialog'
import { UserDetailDrawer } from './user-detail-drawer'
import { UserFormDrawer } from './user-form-drawer'
import { UserResetPasswordDialog } from './user-reset-password-dialog'
import { UserTable } from './user-table'
import { UserToolbar } from './user-toolbar'

/** Columns the user screen keeps out of the default view; the toolbar can show them. */
const HIDDEN_BY_DEFAULT: ColumnVisibilityState = {
  isSystem: false,
  createUserString: false,
  updateUserString: false,
  updateTime: false
}

/** The user query sorts on its own `t1` table alias. */
const DEFAULT_SORT = 't1.id,desc'

const SEARCH_DEBOUNCE_MS = 300

/** Stable empty array, so an empty page does not rebuild the table's row model. */
const EMPTY_ROWS: UserResp[] = []

const STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: '1', label: '启用' },
  { value: '2', label: '禁用' }
]

export function UserList() {
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>(HIDDEN_BY_DEFAULT)
  const [status, setStatus] = React.useState<UserStatus | undefined>(undefined)
  const [searchInput, setSearchInput] = React.useState('')
  const [keyword, setKeyword] = React.useState('')
  const [isExporting, setIsExporting] = React.useState(false)
  const [detailUserId, setDetailUserId] = React.useState<string | number | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  // The form drawer covers both 新增 and 修改, so a null id means "create" rather than "nothing
  // picked yet"; the open flag is what says whether the drawer is showing at all.
  const [formUserId, setFormUserId] = React.useState<string | number | null>(null)
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  // Both dialogs use the row's id and display name; role assignment fetches the current roles on open.
  const [resetUser, setResetUser] = React.useState<UserResp | null>(null)
  const [isResetOpen, setIsResetOpen] = React.useState(false)
  const [roleUser, setRoleUser] = React.useState<UserResp | null>(null)
  const [isRolesOpen, setIsRolesOpen] = React.useState(false)
  const [deletingUser, setDeletingUser] = React.useState<UserResp | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  const { isFullscreen, reservedHeight, fullscreenRef, spacerRef, toggleFullscreen } = useFullscreenTransition()

  // Debounced so typing in the search box does not fire a request per keystroke.
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(searchInput.trim())
      setPagination(current => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [searchInput])

  const query = useQuery({
    queryKey: userKeys.list({
      page: pagination.pageIndex + 1,
      size: pagination.pageSize,
      status,
      description: keyword || undefined,
      sort: DEFAULT_SORT
    }),
    queryFn: () =>
      listUsers({
        page: pagination.pageIndex + 1,
        size: pagination.pageSize,
        status,
        description: keyword || undefined,
        sort: DEFAULT_SORT
      }),
    // Keep the current page on screen while the next one loads; the table dims it.
    placeholderData: previous => previous
  })

  // Warm the metadata lookups so drawers and pickers open instantly without popover spinners.
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

  // When records are deleted or filter results shrink, auto-fallback to the last valid page if out of bounds.
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
      setIsDetailOpen(true)
      return
    }

    if (action === 'edit') {
      setFormUserId(user.id)
      setIsFormOpen(true)
      return
    }

    if (action === 'resetPassword') {
      setResetUser(user)
      setIsResetOpen(true)
      return
    }

    if (action === 'assignRoles') {
      setRoleUser(user)
      setIsRolesOpen(true)
      return
    }

    if (action === 'delete') {
      setDeletingUser(user)
      setIsDeleteOpen(true)
    }
  }, [])

  const columns = React.useMemo(() => createUserColumns(handleRowAction, rowOffset), [handleRowAction, rowOffset])

  const table = useTable({
    features: dataTableFeatures,
    data: query.data?.list ?? EMPTY_ROWS,
    columns,
    state: { columnVisibility, pagination },
    manualPagination: true,
    rowCount: total,
    // Bounds `setPageIndex`; without it the last page can be stepped past.
    pageCount: Math.max(Math.ceil(total / pagination.pageSize), 1),
    autoResetPageIndex: false,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getRowId: row => String(row.id)
  })

  const handleStatusChange = (value: string | null) => {
    setStatus(!value || value === 'all' ? undefined : (Number(value) as UserStatus))
    setPagination(current => ({ ...current, pageIndex: 0 }))
  }

  const handleExport = async () => {
    setIsExporting(true)

    try {
      await exportUsers({ status, description: keyword || undefined, sort: DEFAULT_SORT })
      toast.add({ title: '导出已开始，请留意浏览器下载', type: 'success' })
    } catch {
      // The HTTP layer already reported the failure.
    } finally {
      setIsExporting(false)
    }
  }

  const tableSection = (
    <>
      <div className="flex flex-wrap items-center gap-3 px-4">
        <Select
          items={STATUS_OPTIONS}
          value={status === undefined ? 'all' : String(status)}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger size="sm">
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

      <UserToolbar
        table={table}
        isRefreshing={query.isFetching && !query.isPending}
        isExporting={isExporting}
        isFullscreen={isFullscreen}
        onCreate={() => {
          setFormUserId(null)
          setIsFormOpen(true)
        }}
        onImport={() => reportPending('导入数据')}
        onExport={() => void handleExport()}
        onRefresh={() => void query.refetch()}
        onToggleFullscreen={toggleFullscreen}
        onResetColumns={() => setColumnVisibility(HIDDEN_BY_DEFAULT)}
      />

      <UserTable
        table={table}
        isLoading={query.isPending}
        isError={query.isError}
        isStale={query.isPlaceholderData || query.isError}
        onRetry={() => void query.refetch()}
      />
    </>
  )

  return (
    <>
      <Card>
        <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          <CardTitle className="text-xl leading-none">用户管理</CardTitle>
          <CardDescription className="max-w-sm leading-snug">维护系统用户，查看所属部门与角色授权。</CardDescription>
          <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
            <InputGroup className="h-7 w-full md:w-64">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                className="h-7"
                placeholder="搜索用户名 / 昵称 / 描述"
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

      <UserDetailDrawer userId={detailUserId} open={isDetailOpen} onClose={() => setIsDetailOpen(false)} />
      <UserFormDrawer userId={formUserId} open={isFormOpen} onClose={() => setIsFormOpen(false)} />
      <UserResetPasswordDialog user={resetUser} open={isResetOpen} onClose={() => setIsResetOpen(false)} />
      <UserAssignRolesDialog user={roleUser} open={isRolesOpen} onClose={() => setIsRolesOpen(false)} />
      <UserDeleteDialog user={deletingUser} open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} />
    </>
  )
}
