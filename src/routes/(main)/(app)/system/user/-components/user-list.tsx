import * as React from 'react'

import { useQuery } from '@tanstack/react-query'
import { type ColumnVisibilityState, type PaginationState, useTable } from '@tanstack/react-table'

import { cn } from 'cn'
import { Search } from 'lucide-react'

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { exportUsers, listUsers, type UserResp, type UserStatus } from '@/lib/api/user'
import { dataTableFeatures } from '@/lib/data-table-features'

import { UserAssignRolesDialog } from './user-assign-roles-dialog'
import { createUserColumns, type UserAction } from './user-columns'
import { UserDetailDrawer } from './user-detail-drawer'
import { UserEditDrawer } from './user-edit-drawer'
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

/** `closing` keeps the fullscreen layout applied while `animate-out` plays. */
type FullscreenState = 'off' | 'open' | 'closing'

/** Must match the `animate-out` duration used by the fullscreen container. */
const FULLSCREEN_EXIT_MS = 150

/**
 * How long a fetched page counts as fresh.
 *
 * With the automatic triggers below turned off, nothing refetches on its own; this only
 * keeps the query's staleness honest for any future consumer.
 */
const STALE_TIME_MS = 30_000

/** Stable empty array, so an empty page does not rebuild the table's row model. */
const EMPTY_ROWS: UserResp[] = []

/** Row actions that are still to be built, keyed by the action the table raises. */
type PendingAction = Exclude<UserAction, 'detail' | 'edit' | 'resetPassword' | 'assignRoles'>

const PENDING_ACTION_LABELS: Record<PendingAction, string> = {
  delete: '删除'
}

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
  const [editUserId, setEditUserId] = React.useState<string | number | null>(null)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  // The two dialogs act on a whole row, so they keep the row itself: the password reset only
  // needs its name, and the role picker seeds its selection from the row's `roleIds`.
  const [resetUser, setResetUser] = React.useState<UserResp | null>(null)
  const [isResetOpen, setIsResetOpen] = React.useState(false)
  const [roleUser, setRoleUser] = React.useState<UserResp | null>(null)
  const [isRolesOpen, setIsRolesOpen] = React.useState(false)
  const [fullscreen, setFullscreen] = React.useState<FullscreenState>('off')
  const [reservedHeight, setReservedHeight] = React.useState(0)
  const fullscreenRef = React.useRef<HTMLDivElement>(null)
  const exitTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const isFullscreen = fullscreen !== 'off'

  // Debounced so typing in the search box does not fire a request per keystroke.
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(searchInput.trim())
      setPagination(current => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [searchInput])

  const closeFullscreen = React.useCallback(() => {
    clearTimeout(exitTimer.current)
    setFullscreen('closing')
    exitTimer.current = setTimeout(() => setFullscreen('off'), FULLSCREEN_EXIT_MS)
  }, [])

  React.useEffect(() => () => clearTimeout(exitTimer.current), [])

  const toggleFullscreen = () => {
    if (fullscreen !== 'off') {
      closeFullscreen()
      return
    }

    // Hold the table's height while it is out of flow, so the card does not collapse
    // behind the overlay and the closing animation lands back in place.
    setReservedHeight(fullscreenRef.current?.offsetHeight ?? 0)
    setFullscreen('open')
  }

  // Esc restores the table. This maximizes with CSS instead of the Fullscreen API,
  // because the API promotes the container into the top layer and every portal-based
  // overlay (dropdowns, selects, toasts) would then be painted underneath it.
  React.useEffect(() => {
    if (!isFullscreen) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeFullscreen()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isFullscreen, closeFullscreen])

  const query = useQuery({
    queryKey: ['system', 'user', pagination.pageIndex, pagination.pageSize, status, keyword],
    queryFn: () =>
      listUsers({
        page: pagination.pageIndex + 1,
        size: pagination.pageSize,
        status,
        description: keyword || undefined,
        sort: DEFAULT_SORT
      }),
    staleTime: STALE_TIME_MS,
    // The toolbar owns refreshing. Left at their defaults these three refetch whenever the
    // data has aged past `staleTime`, so switching tabs or reopening the page fired a request
    // and spun the refresh button. A failed first load still retries, because a query with no
    // data loads on mount regardless of `refetchOnMount`.
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Keep the current page on screen while the next one loads; the table dims it.
    placeholderData: previous => previous
  })

  const total = query.data?.total ?? 0
  const rowOffset = pagination.pageIndex * pagination.pageSize

  const reportPending = React.useCallback((label: string) => {
    toast.add({ title: `${label}功能开发中`, type: 'info' })
  }, [])

  const handleRowAction = React.useCallback(
    (action: UserAction, user: UserResp) => {
      if (action === 'detail') {
        setDetailUserId(user.id)
        setIsDetailOpen(true)
        return
      }

      if (action === 'edit') {
        setEditUserId(user.id)
        setIsEditOpen(true)
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

      reportPending(PENDING_ACTION_LABELS[action])
    },
    [reportPending]
  )

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
        onCreate={() => reportPending('新增用户')}
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
          {fullscreen === 'open' ? <div style={{ height: reservedHeight }} /> : null}

          <div
            ref={fullscreenRef}
            className={cn(
              'flex flex-col gap-4',
              fullscreen === 'open' &&
                'fixed inset-0 z-50 animate-in overflow-auto bg-background py-4 duration-200 zoom-in-95 fade-in'
            )}
          >
            {tableSection}
          </div>

          {/*
          The closing overlay is a second copy rather than the element above. Keeping the
          table in the card during the exit means the overlay fades away to reveal it,
          instead of fading to nothing and popping back into place on the next commit.
        */}
          {fullscreen === 'closing' ? (
            <div className="pointer-events-none fixed inset-0 z-50 animate-out overflow-auto bg-background py-4 duration-150 zoom-out-95 fade-out">
              <div className="flex flex-col gap-4">{tableSection}</div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <UserDetailDrawer userId={detailUserId} open={isDetailOpen} onClose={() => setIsDetailOpen(false)} />
      <UserEditDrawer userId={editUserId} open={isEditOpen} onClose={() => setIsEditOpen(false)} />
      <UserResetPasswordDialog user={resetUser} open={isResetOpen} onClose={() => setIsResetOpen(false)} />
      <UserAssignRolesDialog user={roleUser} open={isRolesOpen} onClose={() => setIsRolesOpen(false)} />
    </>
  )
}
