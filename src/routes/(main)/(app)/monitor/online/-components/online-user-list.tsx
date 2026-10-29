import * as React from 'react'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { type ColumnVisibilityState, type PaginationState, useTable } from '@tanstack/react-table'
import type { DateRange } from 'react-day-picker'

import { DateRangeFilter } from '@/components/date-range-filter'
import { ListPageCard } from '@/components/list-page-card'
import { TableSearch } from '@/components/table-search'
import { TableToolbar } from '@/components/table-toolbar'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'
import { usePageClamp } from '@/hooks/use-page-clamp'
import { usePermission } from '@/hooks/use-permission'
import { listOnlineUsers, onlineUserKeys, type OnlineUserPageQuery, type OnlineUserResp } from '@/lib/api/online'
import { getSessionId } from '@/lib/auth-session'
import { dataTableFeatures } from '@/lib/data-table-features'
import { createRecentDateRange, toDateTimeRangeQuery } from '@/lib/date-range'

import { createOnlineUserColumns } from './online-user-columns'
import { OnlineUserKickoutDialog } from './online-user-kickout-dialog'
import { OnlineUserTable } from './online-user-table'

const EMPTY_ROWS: OnlineUserResp[] = []

export function OnlineUserList() {
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({})
  const [keyword, setKeyword] = React.useState('')
  const [loginTime, setLoginTime] = React.useState<DateRange | undefined>(createRecentDateRange)
  const [kickingUser, setKickingUser] = React.useState<OnlineUserResp | null>(null)
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

  const resetPage = () => {
    setPagination(current => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
  }

  const handleSearch = (next: string) => {
    setKeyword(next)
    resetPage()
  }

  const handleLoginTimeChange = (next: DateRange | undefined) => {
    setLoginTime(next)
    resetPage()
  }

  const params: OnlineUserPageQuery = {
    page: pagination.pageIndex + 1,
    size: pagination.pageSize,
    nickname: keyword || undefined,
    loginTime: toDateTimeRangeQuery(loginTime)
  }

  const query = useQuery({
    queryKey: onlineUserKeys.list(params),
    queryFn: ({ signal }) => listOnlineUsers(params, signal),
    placeholderData: keepPreviousData
  })

  const total = query.data?.total ?? 0
  const rowOffset = pagination.pageIndex * pagination.pageSize

  usePageClamp(total, pagination, setPagination)

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
        className="col-span-2 h-8 w-full sm:w-64"
        clearable
        placeholder="搜索用户名、昵称"
        onSearch={handleSearch}
      />
      <DateRangeFilter value={loginTime} onChange={handleLoginTimeChange} placeholder="登录时间" />
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
