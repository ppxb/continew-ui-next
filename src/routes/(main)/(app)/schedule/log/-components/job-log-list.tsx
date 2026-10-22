import * as React from 'react'

import { useQuery } from '@tanstack/react-query'
import { type ColumnVisibilityState, type PaginationState, useTable } from '@tanstack/react-table'
import { useNavigate } from '@tanstack/react-router'

import type { DateRange } from 'react-day-picker'

import { RotateCcw } from 'lucide-react'

import { DateRangeFilter } from '@/components/date-range-filter'
import { ListPageCard } from '@/components/list-page-card'
import { TableSearch } from '@/components/table-search'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'
import { usePermission } from '@/hooks/use-permission'
import { jobKeys, listJobGroups } from '@/lib/api/job'
import {
  JOB_EXECUTE_STATUS_OPTIONS,
  jobLogKeys,
  listJobLogs,
  type JobExecuteStatus,
  type JobLogQuery,
  type JobLogResp
} from '@/lib/api/job-log'
import { createRecentDateRange, toDateTimeRangeQuery } from '@/lib/date-range'
import { dataTableFeatures } from '@/lib/data-table-features'

import { JobLogActionDialog, type JobLogActionTarget } from './job-log-action-dialog'
import { createJobLogColumns, type JobLogAction } from './job-log-columns'
import { JobLogTable } from './job-log-table'
import { JobLogToolbar } from './job-log-toolbar'

const EMPTY_ROWS: JobLogResp[] = []

/** Groups barely change, so the filter stays cached between visits. */
const LOOKUP_STALE_MS = 5 * 60_000

const NO_HIDDEN_COLUMNS: ColumnVisibilityState = {}

interface JobLogListProps {
  /** A job carried over from the job page's 查看日志 action. */
  readonly initialJobId?: number
  readonly initialJobName?: string
  readonly initialGroupName?: string
}

export function JobLogList({ initialJobId, initialJobName, initialGroupName }: JobLogListProps) {
  const navigate = useNavigate()
  const { hasPermission } = usePermission()
  const canStop = hasPermission('schedule:log:stop')
  const canRetry = hasPermission('schedule:log:retry')
  // `/schedule/job/group` needs the job list permission; a log-only role can still use the page.
  const canListJobs = hasPermission('schedule:job:list')
  const fullscreen = useFullscreenTransition()

  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>(NO_HIDDEN_COLUMNS)
  const [jobId, setJobId] = React.useState<number | undefined>(initialJobId)
  const [groupName, setGroupName] = React.useState<string | undefined>(initialGroupName)
  const [keyword, setKeyword] = React.useState(initialJobName ?? '')
  const [searchText, setSearchText] = React.useState(initialJobName ?? '')
  const [status, setStatus] = React.useState<JobExecuteStatus | undefined>(undefined)
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(() => createRecentDateRange())
  const [actionTarget, setActionTarget] = React.useState<JobLogActionTarget | null>(null)

  const groups = useQuery({
    queryKey: jobKeys.groups(),
    queryFn: listJobGroups,
    staleTime: LOOKUP_STALE_MS,
    enabled: canListJobs
  })

  const groupOptions = React.useMemo(() => {
    const list = groups.data ?? []
    return groupName && !list.includes(groupName) ? [groupName, ...list] : list
  }, [groups.data, groupName])

  const groupItems = React.useMemo(
    () => [{ value: 'all', label: '全部任务组' }, ...groupOptions.map(group => ({ value: group, label: group }))],
    [groupOptions]
  )

  const goToFirstPage = React.useCallback(() => {
    setPagination(current => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
  }, [])

  /** Clearing the URL search keeps the hidden `jobId` from outliving the visible filters. */
  const clearRouteSearch = React.useCallback(() => {
    void navigate({ to: '/schedule/log', search: {}, replace: true })
  }, [navigate])

  const releaseJobFilter = React.useCallback(() => {
    if (jobId === undefined) {
      return
    }

    setJobId(undefined)
    clearRouteSearch()
  }, [jobId, clearRouteSearch])

  const handleKeywordSearch = React.useCallback(
    (next: string) => {
      setKeyword(next)
      releaseJobFilter()
      goToFirstPage()
    },
    [releaseJobFilter, goToFirstPage]
  )

  const handleGroupChange = React.useCallback(
    (value: string | null) => {
      setGroupName(!value || value === 'all' ? undefined : value)
      releaseJobFilter()
      goToFirstPage()
    },
    [releaseJobFilter, goToFirstPage]
  )

  const handleStatusChange = React.useCallback(
    (value: string | null) => {
      setStatus(!value || value === 'all' ? undefined : (Number(value) as JobExecuteStatus))
      releaseJobFilter()
      goToFirstPage()
    },
    [releaseJobFilter, goToFirstPage]
  )

  const handleDateRangeChange = React.useCallback(
    (range: DateRange | undefined) => {
      setDateRange(range)
      releaseJobFilter()
      goToFirstPage()
    },
    [releaseJobFilter, goToFirstPage]
  )

  const handleReset = React.useCallback(() => {
    setJobId(undefined)
    setGroupName(undefined)
    setKeyword('')
    setSearchText('')
    setStatus(undefined)
    setDateRange(createRecentDateRange())
    goToFirstPage()
    clearRouteSearch()
  }, [clearRouteSearch, goToFirstPage])

  const handleAction = React.useCallback((type: JobLogAction, log: JobLogResp) => {
    setActionTarget({ type, log })
  }, [])

  const params: JobLogQuery = {
    page: pagination.pageIndex + 1,
    size: pagination.pageSize,
    jobId,
    groupName,
    jobName: keyword || undefined,
    taskBatchStatus: status,
    datetimeRange: toDateTimeRangeQuery(dateRange)
  }

  const query = useQuery({
    queryKey: jobLogKeys.list(params),
    queryFn: () => listJobLogs(params),
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
    () => createJobLogColumns({ rowOffset, canStop, canRetry, onAction: handleAction }),
    [rowOffset, canStop, canRetry, handleAction]
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
        className="col-span-2 h-8 w-full sm:w-64"
        value={searchText}
        onValueChange={setSearchText}
        onSearch={handleKeywordSearch}
        clearable
        placeholder="搜索任务名称"
      />
      <div className="w-full sm:w-40">
        <Select items={groupItems} value={groupName ?? 'all'} onValueChange={handleGroupChange}>
          <SelectTrigger className="w-full">
            <span className="text-muted-foreground">任务组</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectGroup>
              {groupItems.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="w-full sm:w-32">
        <Select
          items={JOB_EXECUTE_STATUS_OPTIONS}
          value={status === undefined ? 'all' : String(status)}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-full">
            <span className="text-muted-foreground">状态</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectGroup>
              {JOB_EXECUTE_STATUS_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />
      <Button type="button" variant="ghost" onClick={handleReset}>
        <RotateCcw />
        重置
      </Button>
    </>
  )

  const actions = (
    <JobLogToolbar
      table={table}
      isRefreshing={query.isFetching && !query.isPending}
      isFullscreen={fullscreen.isFullscreen}
      onRefresh={() => void query.refetch()}
      onToggleFullscreen={fullscreen.toggleFullscreen}
      onResetColumns={() => setColumnVisibility(NO_HIDDEN_COLUMNS)}
    />
  )

  return (
    <>
      <ListPageCard
        title="任务日志"
        description="查看任务调度记录、执行状态与执行结果"
        filters={filters}
        actions={actions}
        fullscreen={fullscreen}
      >
        <JobLogTable
          table={table}
          isLoading={query.isPending}
          isError={query.isError}
          isShowingPreviousRows={query.isPlaceholderData}
          onRetry={() => void query.refetch()}
        />
      </ListPageCard>

      <JobLogActionDialog action={actionTarget} open={actionTarget !== null} onClose={() => setActionTarget(null)} />
    </>
  )
}
