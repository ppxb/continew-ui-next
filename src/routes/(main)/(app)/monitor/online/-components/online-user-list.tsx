import * as React from 'react'

import { useQuery } from '@tanstack/react-query'
import { type ColumnVisibilityState, type PaginationState, useTable } from '@tanstack/react-table'
import { addDays, format, startOfDay } from 'date-fns'
import type { DateRange } from 'react-day-picker'

import { cn } from 'cn'

import { TableSearch } from '@/components/table-search'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'
import { usePermission } from '@/hooks/use-permission'
import { listOnlineUsers, onlineUserKeys, type OnlineUserPageQuery, type OnlineUserResp } from '@/lib/api/online'
import { getSessionId } from '@/lib/auth-session'
import { dataTableFeatures } from '@/lib/data-table-features'

import { createOnlineUserColumns } from './online-user-columns'
import { OnlineUserKickoutDialog } from './online-user-kickout-dialog'
import { OnlineUserTable } from './online-user-table'
import { OnlineUserToolbar } from './online-user-toolbar'

const EMPTY_ROWS: OnlineUserResp[] = []

/**
 * The range the picker hands over covers whole days, while the backend compares login times
 * with strict inequalities. Ending at the midnight after the last picked day therefore covers
 * that whole day without spilling into the next one.
 */
function toLoginTimeQuery(range: DateRange | undefined) {
  if (!range?.from) {
    return undefined
  }

  const from = format(startOfDay(range.from), 'yyyy-MM-dd HH:mm:ss')
  const to = format(addDays(startOfDay(range.to ?? range.from), 1), 'yyyy-MM-dd HH:mm:ss')
  return `${from},${to}`
}

export function OnlineUserList() {
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({})
  const [keyword, setKeyword] = React.useState('')
  const [loginTime, setLoginTime] = React.useState<DateRange | undefined>(undefined)
  const [kickingUser, setKickingUser] = React.useState<OnlineUserResp | null>(null)
  // The search box owns its text, so resetting the filters remounts it.
  const [searchVersion, setSearchVersion] = React.useState(0)
  const { hasPermission } = usePermission()
  const { isFullscreen, reservedHeight, fullscreenRef, spacerRef, toggleFullscreen } = useFullscreenTransition()

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
    setLoginTime(undefined)
    setSearchVersion(current => current + 1)
    setPagination(current => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
  }, [])

  const params: OnlineUserPageQuery = {
    page: pagination.pageIndex + 1,
    size: pagination.pageSize,
    nickname: keyword || undefined,
    loginTime: toLoginTimeQuery(loginTime)
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

  const tableSection = (
    <>
      <OnlineUserToolbar
        table={table}
        isRefreshing={query.isFetching && !query.isPending}
        isFullscreen={isFullscreen}
        loginTime={loginTime}
        onLoginTimeChange={handleLoginTimeChange}
        onReset={handleReset}
        onRefresh={() => void query.refetch()}
        onToggleFullscreen={toggleFullscreen}
        onResetColumns={() => setColumnVisibility({})}
      />

      <OnlineUserTable
        table={table}
        isLoading={query.isPending}
        isError={query.isError}
        isShowingPreviousRows={query.isPlaceholderData}
        onRetry={() => void query.refetch()}
      />
    </>
  )

  return (
    <>
      <Card className="pb-0">
        <CardHeader className="has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          <CardTitle className="text-xl">在线用户</CardTitle>
          <CardDescription>查看当前登录的会话，可将指定会话强制退出</CardDescription>
          <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
            <TableSearch key={searchVersion} clearable placeholder="搜索用户名、昵称" onSearch={handleSearch} />
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 px-0">
          {isFullscreen ? <div ref={spacerRef} style={{ height: reservedHeight }} /> : null}

          <div ref={fullscreenRef} className={cn('flex flex-col gap-4', isFullscreen && 'bg-background')}>
            {tableSection}
          </div>
        </CardContent>
      </Card>

      <OnlineUserKickoutDialog user={kickingUser} open={kickingUser !== null} onClose={() => setKickingUser(null)} />
    </>
  )
}
