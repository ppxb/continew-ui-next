import * as React from 'react'

import { useQuery } from '@tanstack/react-query'
import { type ColumnVisibilityState, type PaginationState, useTable } from '@tanstack/react-table'
import type { DateRange } from 'react-day-picker'

import { ListPageCard } from '@/components/list-page-card'
import { TableSearch } from '@/components/table-search'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'
import { usePermission } from '@/hooks/use-permission'
import { listOnlineUsers, onlineUserKeys, type OnlineUserPageQuery, type OnlineUserResp } from '@/lib/api/online'
import { getSessionId } from '@/lib/auth-session'
import { dataTableFeatures } from '@/lib/data-table-features'
import { createRecentDateRange, toDateTimeRangeQuery } from '@/lib/date-range'

import { createOnlineUserColumns } from './online-user-columns'
import { OnlineUserKickoutDialog } from './online-user-kickout-dialog'
import { OnlineUserTable } from './online-user-table'
import { OnlineUserFilters, OnlineUserToolbar } from './online-user-toolbar'

const EMPTY_ROWS: OnlineUserResp[] = []

export function OnlineUserList() {
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({})
  const [keyword, setKeyword] = React.useState('')
  const [loginTime, setLoginTime] = React.useState<DateRange | undefined>(createRecentDateRange)
  const [kickingUser, setKickingUser] = React.useState<OnlineUserResp | null>(null)
  // The search box owns its text, so resetting the filters remounts it.
  const [searchVersion, setSearchVersion] = React.useState(0)
  const { hasPermission } = usePermission()
  const fullscreen = useFullscreenTransition()

  // Without the permission the backend drops the action as well; hiding the column avoids a
  // button that can only fail.
  const canKickout = hasPermission('monitor:online:kickout')
  const currentSessionId = getSessionId()
  const isCurrentSession = React.useCallback(
    (sessionId: string) => currentSessionId !== null && sessionId === currentSessionId,
    [currentSessionId]
  )

  const handleSearch = React.useCallback((next: string) => {
    setKeyword(next)
    setPagination(current => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
  }, [])

  const handleLoginTimeChange = React.useCallback((next: DateRange | undefined) => {
    setLoginTime(next)
    setPagination(current => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
  }, [])

  const handleReset = React.useCallback(() => {
    setKeyword('')
    setLoginTime(createRecentDateRange())
    setSearchVersion(current => current + 1)
    setPagination(current => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
  }, [])

  const params: OnlineUserPageQuery = {
    page: pagination.pageIndex + 1,
    size: pagination.pageSize,
    nickname: keyword || undefined,
    loginTime: toDateTimeRangeQuery(loginTime)
  }

  const query = useQuery({
    queryKey: onlineUserKeys.list(params),
    queryFn: () => listOnlineUsers(params),
    placeholderData: previous => previous
  })

  const total = query.data?.total ?? 0
  const rowOffset = pagination.pageIndex * pagination.pageSize

  React.useEffect(() => {
    if (total > 0 && pagination.pageIndex * pagination.pageSize >= total) {
      const maxPageIndex = Math.max(0, Math.ceil(total / pagination.pageSize) - 1)
      setPagination(current => ({ ...current, pageIndex: maxPageIndex }))
    }
  }, [total, pagination.pageIndex, pagination.pageSize])

  const handleKickout = React.useCallback((user: OnlineUserResp) => {
    setKickingUser(user)
  }, [])

  const columns = React.useMemo(
    () => createOnlineUserColumns({ rowOffset, canKickout, isCurrentSession, onKickout: handleKickout }),
    [rowOffset, canKickout, isCurrentSession, handleKickout]
  )

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
    getRowId: row => row.sessionId
  })

  const filters = (
    <>
      <TableSearch
        key={searchVersion}
        clearable
        className="col-span-2 h-8 w-full sm:w-64"
        placeholder="搜索用户名、昵称"
        onSearch={handleSearch}
      />
      <OnlineUserFilters loginTime={loginTime} onLoginTimeChange={handleLoginTimeChange} onReset={handleReset} />
    </>
  )

  const actions = (
    <OnlineUserToolbar
      table={table}
      isRefreshing={query.isFetching && !query.isPending}
      isFullscreen={fullscreen.isFullscreen}
      onRefresh={() => void query.refetch()}
      onToggleFullscreen={fullscreen.toggleFullscreen}
      onResetColumns={() => setColumnVisibility({})}
    />
  )

  return (
    <>
      <ListPageCard
        title="在线用户"
        description="查看当前登录的会话，可将指定会话强制退出"
        filters={filters}
        actions={actions}
        fullscreen={fullscreen}
      >
        <OnlineUserTable
          table={table}
          isLoading={query.isPending}
          isError={query.isError}
          isShowingPreviousRows={query.isPlaceholderData}
          onRetry={() => void query.refetch()}
        />
      </ListPageCard>

      <OnlineUserKickoutDialog user={kickingUser} open={kickingUser !== null} onClose={() => setKickingUser(null)} />
    </>
  )
}
