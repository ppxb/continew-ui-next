import * as React from 'react'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { type ColumnVisibilityState, type PaginationState, useTable } from '@tanstack/react-table'
import { Download, RotateCcw } from 'lucide-react'
import type { DateRange } from 'react-day-picker'

import { DateRangeFilter } from '@/components/date-range-filter'
import { FilterSelect } from '@/components/filter-select'
import { ListPageCard } from '@/components/list-page-card'
import { TableSearch } from '@/components/table-search'
import { TableToolbar } from '@/components/table-toolbar'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useExport } from '@/hooks/use-export'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'
import { usePageClamp } from '@/hooks/use-page-clamp'
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

import { createLoginLogColumns, createOperationLogColumns, LOG_COLUMN_LABELS } from './log-columns'
import { LogDetailDrawer } from './log-detail-drawer'
import { LogTable } from './log-table'

type LogMode = 'login' | 'operation'

const EMPTY_ROWS: LogResp[] = []

/** The log query sorts on its own `t1` table alias, by the SQL column the mapper selects. */
const DEFAULT_SORT = 't1.create_time,desc'

const STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: '1', label: '成功' },
  { value: '2', label: '失败' }
]

const PLACEHOLDERS: Record<LogMode, { operator: string; ip: string; date: string }> = {
  login: { operator: '搜索登录用户', ip: '搜索登录 IP 或地点', date: '登录时间' },
  operation: { operator: '搜索操作人', ip: '搜索操作 IP 或地点', date: '操作时间' }
}

interface LogListProps {
  readonly mode: LogMode
}

/** One log tab: its filters, its table and, for operation rows, the detail drawer. */
export function LogList({ mode }: LogListProps) {
  const isLogin = mode === 'login'
  const placeholders = PLACEHOLDERS[mode]
  const fullscreen = useFullscreenTransition()
  const { hasPermission } = usePermission()
  const canExport = hasPermission('monitor:log:export')
  const canViewDetail = hasPermission('monitor:log:get')
  const { isExporting, exportData } = useExport<LogExportQuery>(isLogin ? exportLoginLogs : exportOperationLogs)

  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({})
  const [operator, setOperator] = React.useState('')
  const [ip, setIp] = React.useState('')
  const [status, setStatus] = React.useState<LogStatus | undefined>(undefined)
  const [createTime, setCreateTime] = React.useState<DateRange | undefined>(createRecentDateRange)
  // The search boxes keep their own text, so a reset remounts them.
  const [searchVersion, setSearchVersion] = React.useState(0)
  const [detailId, setDetailId] = React.useState<string | number | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)

  const resetPage = () => {
    setPagination(current => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
  }

  const queryFilters: LogExportQuery = {
    sort: DEFAULT_SORT,
    module: isLogin ? '登录' : undefined,
    createUserString: operator || undefined,
    ip: ip || undefined,
    createTime: toDateTimeRangeQuery(createTime),
    status
  }
  const params: LogPageQuery = { page: pagination.pageIndex + 1, size: pagination.pageSize, ...queryFilters }

  const query = useQuery({
    queryKey: logKeys.list(params),
    queryFn: ({ signal }) => listLogs(params, signal),
    placeholderData: keepPreviousData
  })

  const total = query.data?.total ?? 0
  const rowOffset = pagination.pageIndex * pagination.pageSize

  usePageClamp(total, pagination, setPagination)

  const handleOperatorSearch = (next: string) => {
    setOperator(next)
    resetPage()
  }

  const handleIpSearch = (next: string) => {
    setIp(next)
    resetPage()
  }

  const handleCreateTimeChange = (next: DateRange | undefined) => {
    setCreateTime(next)
    resetPage()
  }

  const handleStatusChange = (value: string | null) => {
    setStatus(value === '1' ? 1 : value === '2' ? 2 : undefined)
    resetPage()
  }

  const handleReset = () => {
    setOperator('')
    setIp('')
    setStatus(undefined)
    setCreateTime(createRecentDateRange())
    setSearchVersion(current => current + 1)
    resetPage()
  }

  const handleDetail = React.useCallback((log: LogResp) => {
    setDetailId(log.id)
    setIsDetailOpen(true)
  }, [])

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

  const filters = (
    <>
      <TableSearch
        key={`operator-${searchVersion}`}
        className="col-span-2 h-8 w-full md:w-52"
        clearable
        placeholder={placeholders.operator}
        onSearch={handleOperatorSearch}
      />
      <TableSearch
        key={`ip-${searchVersion}`}
        className="col-span-2 h-8 w-full md:w-56"
        clearable
        placeholder={placeholders.ip}
        onSearch={handleIpSearch}
      />
      <DateRangeFilter value={createTime} onChange={handleCreateTimeChange} placeholder={placeholders.date} />
      <FilterSelect
        label="状态"
        options={STATUS_OPTIONS}
        value={status === undefined ? 'all' : String(status)}
        onValueChange={handleStatusChange}
        className="w-full sm:w-32"
      />
      <Button type="button" variant="ghost" onClick={handleReset}>
        <RotateCcw />
        重置
      </Button>
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
      columnLabels={LOG_COLUMN_LABELS}
      actions={
        canExport ? (
          <Button variant="outline" disabled={isExporting} onClick={() => void exportData(queryFilters)}>
            {isExporting ? <Spinner /> : <Download />}
            导出
          </Button>
        ) : null
      }
    />
  )

  return (
    <>
      <ListPageCard filters={filters} actions={actions} fullscreen={fullscreen}>
        <LogTable
          table={table}
          isLoading={query.isPending}
          isError={query.isError}
          isShowingPreviousRows={query.isPlaceholderData}
          onRetry={() => void query.refetch()}
        />
      </ListPageCard>

      {!isLogin && canViewDetail ? (
        <LogDetailDrawer logId={detailId} open={isDetailOpen} onClose={() => setIsDetailOpen(false)} />
      ) : null}
    </>
  )
}
