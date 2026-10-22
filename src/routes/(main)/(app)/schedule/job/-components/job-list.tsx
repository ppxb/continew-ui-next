import * as React from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type ColumnVisibilityState, type PaginationState, useTable } from '@tanstack/react-table'
import { useNavigate } from '@tanstack/react-router'

import { RotateCcw } from 'lucide-react'

import { ListPageCard } from '@/components/list-page-card'
import { TableSearch } from '@/components/table-search'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'
import { usePermission } from '@/hooks/use-permission'
import {
  JOB_STATUS_OPTIONS,
  jobKeys,
  listJobGroups,
  listJobs,
  updateJobStatus,
  type JobQuery,
  type JobResp,
  type JobStatus
} from '@/lib/api/job'
import { dataTableFeatures } from '@/lib/data-table-features'

import { createJobColumns, type JobAction } from './job-columns'
import { JobDeleteDialog } from './job-delete-dialog'
import { JobDetailDrawer } from './job-detail-drawer'
import { JobFormDrawer } from './job-form-drawer'
import { JobTable } from './job-table'
import { JobToolbar } from './job-toolbar'
import { JobTriggerDialog } from './job-trigger-dialog'

const EMPTY_ROWS: JobResp[] = []

const HIDDEN_BY_DEFAULT: ColumnVisibilityState = {
  updateDt: false
}

/** Groups barely change, so the filter and the form share one cached lookup. */
const LOOKUP_STALE_MS = 5 * 60_000

export function JobList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { hasPermission } = usePermission()
  const canCreate = hasPermission('schedule:job:create')
  const canGet = hasPermission('schedule:job:get')
  const canUpdate = hasPermission('schedule:job:update')
  const canDelete = hasPermission('schedule:job:delete')
  const canTrigger = hasPermission('schedule:job:trigger')
  const canViewLogs = hasPermission('schedule:log:list')
  const fullscreen = useFullscreenTransition()

  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>(HIDDEN_BY_DEFAULT)
  const [keyword, setKeyword] = React.useState('')
  const [jobStatus, setJobStatus] = React.useState<JobStatus | undefined>(undefined)
  const [groupName, setGroupName] = React.useState<string | undefined>(undefined)
  // The job query waits for the first group so the page does not briefly list every group.
  const [groupReady, setGroupReady] = React.useState(false)
  // Once the user picks a group explicitly, a late successful lookup must not override it.
  const groupTouchedRef = React.useRef(false)
  // The search box owns its text, so resetting the filters remounts it.
  const [searchVersion, setSearchVersion] = React.useState(0)
  // One state per overlay: a null value means it is closed. The form drawer holds an object,
  // because a null job there means 新增.
  const [detailJob, setDetailJob] = React.useState<JobResp | null>(null)
  const [formTarget, setFormTarget] = React.useState<{ job: JobResp | null } | null>(null)
  const [triggerJob, setTriggerJob] = React.useState<JobResp | null>(null)
  const [deletingJob, setDeletingJob] = React.useState<JobResp | null>(null)

  const groups = useQuery({
    queryKey: jobKeys.groups(),
    queryFn: listJobGroups,
    staleTime: LOOKUP_STALE_MS
  })

  React.useEffect(() => {
    if (groups.isSuccess) {
      if (!groupTouchedRef.current) {
        setGroupName(current => current ?? groups.data[0])
      }
      setGroupReady(true)
      return
    }

    if (groups.isError) {
      // Let the list load without a group rather than wait forever on a failed lookup.
      setGroupReady(true)
    }
  }, [groups.isSuccess, groups.isError, groups.data])

  const groupItems = React.useMemo(
    () => [
      { value: 'all', label: '全部任务组' },
      ...(groups.data ?? []).map(group => ({ value: group, label: group }))
    ],
    [groups.data]
  )

  const goToFirstPage = React.useCallback(() => {
    setPagination(current => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
  }, [])

  const handleKeywordSearch = React.useCallback(
    (next: string) => {
      setKeyword(next)
      goToFirstPage()
    },
    [goToFirstPage]
  )

  const handleGroupChange = React.useCallback(
    (value: string | null) => {
      groupTouchedRef.current = true
      setGroupName(!value || value === 'all' ? undefined : value)
      goToFirstPage()
    },
    [goToFirstPage]
  )

  const handleStatusChange = React.useCallback(
    (value: string | null) => {
      setJobStatus(!value || value === 'all' ? undefined : (Number(value) as JobStatus))
      goToFirstPage()
    },
    [goToFirstPage]
  )

  const handleReset = React.useCallback(() => {
    groupTouchedRef.current = false
    setGroupName(groups.data?.[0])
    setKeyword('')
    setJobStatus(undefined)
    setSearchVersion(current => current + 1)
    goToFirstPage()
  }, [groups.data, goToFirstPage])

  const handleToggleStatus = React.useCallback(
    async (job: JobResp, next: JobStatus) => {
      await updateJobStatus(job.id, { jobStatus: next })
      toast.add({ title: next === 1 ? '启用成功' : '禁用成功', type: 'success' })
      void queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
    },
    [queryClient]
  )

  const handleAction = React.useCallback(
    (action: JobAction, job: JobResp) => {
      if (action === 'detail') {
        setDetailJob(job)
        return
      }

      if (action === 'trigger') {
        setTriggerJob(job)
        return
      }

      if (action === 'edit') {
        setFormTarget({ job })
        return
      }

      if (action === 'logs') {
        void navigate({
          to: '/schedule/log',
          search: { jobId: job.id, jobName: job.jobName, groupName: job.groupName }
        })
        return
      }

      setDeletingJob(job)
    },
    [navigate]
  )

  const params: JobQuery = {
    page: pagination.pageIndex + 1,
    size: pagination.pageSize,
    groupName,
    jobName: keyword || undefined,
    jobStatus
  }

  const query = useQuery({
    queryKey: jobKeys.list(params),
    queryFn: () => listJobs(params),
    enabled: groupReady,
    placeholderData: previous => previous
  })

  // The API has no detail endpoint, so keep the drawer on the freshest copy of the row the
  // list currently holds and fall back to the clicked snapshot once it leaves the page.
  const liveDetailJob = React.useMemo(() => {
    if (!detailJob) {
      return null
    }

    return query.data?.list.find(job => String(job.id) === String(detailJob.id)) ?? detailJob
  }, [detailJob, query.data])

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
      createJobColumns({
        rowOffset,
        canGet,
        canTrigger,
        canUpdate,
        canViewLogs,
        canDelete,
        onAction: handleAction,
        onToggleStatus: handleToggleStatus
      }),
    [rowOffset, canGet, canTrigger, canUpdate, canViewLogs, canDelete, handleAction, handleToggleStatus]
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
        key={`keyword-${searchVersion}`}
        clearable
        className="col-span-2 h-8 w-full sm:w-64"
        placeholder="搜索任务名称"
        onSearch={handleKeywordSearch}
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
          items={JOB_STATUS_OPTIONS}
          value={jobStatus === undefined ? 'all' : String(jobStatus)}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-full">
            <span className="text-muted-foreground">状态</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectGroup>
              {JOB_STATUS_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <Button type="button" variant="ghost" onClick={handleReset}>
        <RotateCcw />
        重置
      </Button>
    </>
  )

  const actions = (
    <JobToolbar
      table={table}
      isRefreshing={query.isFetching && !query.isPending}
      isFullscreen={fullscreen.isFullscreen}
      canCreate={canCreate}
      onCreate={() => setFormTarget({ job: null })}
      onRefresh={() => void query.refetch()}
      onToggleFullscreen={fullscreen.toggleFullscreen}
      onResetColumns={() => setColumnVisibility(HIDDEN_BY_DEFAULT)}
    />
  )

  return (
    <>
      <ListPageCard
        title="任务管理"
        description="管理定时任务、调度策略与执行状态"
        filters={filters}
        actions={actions}
        fullscreen={fullscreen}
      >
        <JobTable
          table={table}
          isLoading={query.isPending || !groupReady}
          isError={query.isError}
          isShowingPreviousRows={query.isPlaceholderData}
          onRetry={() => void query.refetch()}
        />
      </ListPageCard>

      <JobDetailDrawer job={liveDetailJob} open={detailJob !== null} onClose={() => setDetailJob(null)} />
      <JobFormDrawer
        job={formTarget?.job ?? null}
        open={formTarget !== null}
        onClose={() => setFormTarget(null)}
        defaultGroupName={groupName}
      />
      <JobTriggerDialog job={triggerJob} open={triggerJob !== null} onClose={() => setTriggerJob(null)} />
      <JobDeleteDialog job={deletingJob} open={deletingJob !== null} onClose={() => setDeletingJob(null)} />
    </>
  )
}
