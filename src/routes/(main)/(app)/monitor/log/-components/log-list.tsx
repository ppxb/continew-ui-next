import * as React from 'react'

import { useQuery } from '@tanstack/react-query'
import { type ColumnVisibilityState, type PaginationState, useTable } from '@tanstack/react-table'
import type { DateRange } from 'react-day-picker'

import { cn } from 'cn'

import { Card, CardContent } from '@/components/ui/card'
import { toast } from '@/components/ui/toast'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'
import { usePermission } from '@/hooks/use-permission'
import {
  exportLoginLogs,
  exportOperationLogs,
  listLogs,
  logKeys,
  type LogExportQuery,
  type LogPageQuery,
  type LogResp,
  type LogStatus
} from '@/lib/api/log'
import { dataTableFeatures } from '@/lib/data-table-features'
import { createRecentDateRange, toDateTimeRangeQuery } from '@/lib/date-range'

import { createLoginLogColumns, createOperationLogColumns } from './log-columns'
import { LogDetailDrawer } from './log-detail-drawer'
import { LogTable } from './log-table'
import { LogToolbar } from './log-toolbar'

export type LogMode = 'login' | 'operation'

const EMPTY_ROWS: LogResp[] = []

/** The log query sorts on its own `t1` table alias, by the SQL column the mapper selects. */
const DEFAULT_SORT = 't1.create_time,desc'

interface LogListProps {
  readonly mode: LogMode
}

/**
 * One log tab: its filters, its table and, for operation rows, the detail drawer.
 *
 * Both tabs share the pagination, column visibility and fullscreen behaviour of the online
 * user screen; only the columns and the module filter differ.
 */
export function LogList({ mode }: LogListProps) {
  const isLogin = mode === 'login'
  const { hasPermission } = usePermission()
  const canExport = hasPermission('monitor:log:export')
  const canViewDetail = hasPermission('monitor:log:get')
  const { isFullscreen, reservedHeight, fullscreenRef, spacerRef, toggleFullscreen } = useFullscreenTransition()

  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({})
  const [operator, setOperator] = React.useState('')
  const [ip, setIp] = React.useState('')
  const [status, setStatus] = React.useState<LogStatus | undefined>(undefined)
  const [createTime, setCreateTime] = React.useState<DateRange | undefined>(createRecentDateRange)
  // The search boxes own their text, so resetting the filters remounts them.
  const [searchVersion, setSearchVersion] = React.useState(0)
  const [isExporting, setIsExporting] = React.useState(false)
  const [detailId, setDetailId] = React.useState<string | number | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)

  const goToFirstPage = React.useCallback(() => {
    setPagination(current => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
  }, [])

  const handleOperatorSearch = React.useCallback(
    (next: string) => {
      setOperator(next)
      goToFirstPage()
    },
    [goToFirstPage]
  )

  const handleIpSearch = React.useCallback(
    (next: string) => {
      setIp(next)
      goToFirstPage()
    },
    [goToFirstPage]
  )

  const handleCreateTimeChange = React.useCallback(
    (next: DateRange | undefined) => {
      setCreateTime(next)
      goToFirstPage()
    },
    [goToFirstPage]
  )

  const handleStatusChange = React.useCallback(
    (value: string | null) => {
      setStatus(!value || value === 'all' ? undefined : (Number(value) as LogStatus))
      goToFirstPage()
    },
    [goToFirstPage]
  )

  const handleReset = React.useCallback(() => {
    setOperator('')
    setIp('')
    setStatus(undefined)
    setCreateTime(createRecentDateRange())
    setSearchVersion(current => current + 1)
    goToFirstPage()
  }, [goToFirstPage])

  const handleDetail = React.useCallback((log: LogResp) => {
    setDetailId(log.id)
    setIsDetailOpen(true)
  }, [])

  const filters: LogExportQuery = {
    sort: DEFAULT_SORT,
    module: isLogin ? '登录' : undefined,
    createUserString: operator || undefined,
    ip: ip || undefined,
    createTime: toDateTimeRangeQuery(createTime),
    status
  }
  const params: LogPageQuery = { page: pagination.pageIndex + 1, size: pagination.pageSize, ...filters }

  const query = useQuery({
    queryKey: logKeys.list(params),
    queryFn: ({ signal }) => listLogs(params, signal),
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

  const columns = React.useMemo(
    () =>
      isLogin
        ? createLoginLogColumns(rowOffset)
        : createOperationLogColumns({ rowOffset, canViewDetail, onDetail: handleDetail }),
    [isLogin, rowOffset, canViewDetail, handleDetail]
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
    getRowId: row => String(row.id)
  })

  const handleExport = async () => {
    setIsExporting(true)

    try {
      if (isLogin) {
        await exportLoginLogs(filters)
      } else {
        await exportOperationLogs(filters)
      }

      toast.add({ title: '导出已开始，请留意浏览器下载', type: 'success' })
    } catch {
      // The HTTP layer already reported the failure.
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <Card className="pb-0">
        <CardContent className="flex flex-col gap-4 px-0">
          {isFullscreen ? <div ref={spacerRef} style={{ height: reservedHeight }} /> : null}

          <div ref={fullscreenRef} className={cn('flex flex-col gap-4', isFullscreen && 'bg-background')}>
            <LogToolbar
              table={table}
              isRefreshing={query.isFetching && !query.isPending}
              isExporting={isExporting}
              isFullscreen={isFullscreen}
              canExport={canExport}
              searchVersion={searchVersion}
              operatorPlaceholder={isLogin ? '搜索登录用户' : '搜索操作人'}
              ipPlaceholder={isLogin ? '搜索登录 IP 或地点' : '搜索操作 IP 或地点'}
              datePlaceholder={isLogin ? '登录时间' : '操作时间'}
              createTime={createTime}
              status={status}
              onOperatorSearch={handleOperatorSearch}
              onIpSearch={handleIpSearch}
              onCreateTimeChange={handleCreateTimeChange}
              onStatusChange={handleStatusChange}
              onReset={handleReset}
              onExport={() => void handleExport()}
              onRefresh={() => void query.refetch()}
              onToggleFullscreen={toggleFullscreen}
              onResetColumns={() => setColumnVisibility({})}
            />

            <LogTable
              table={table}
              isLoading={query.isPending}
              isError={query.isError}
              isShowingPreviousRows={query.isPlaceholderData}
              onRetry={() => void query.refetch()}
            />
          </div>
        </CardContent>
      </Card>

      {!isLogin && canViewDetail ? (
        <LogDetailDrawer logId={detailId} open={isDetailOpen} onClose={() => setIsDetailOpen(false)} />
      ) : null}
    </>
  )
}
