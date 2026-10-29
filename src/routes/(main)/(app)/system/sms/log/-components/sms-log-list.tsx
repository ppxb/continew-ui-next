import * as React from 'react'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { type ColumnVisibilityState, type PaginationState, useTable } from '@tanstack/react-table'
import { Download } from 'lucide-react'

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
  exportSmsLogs,
  listSmsLogs,
  smsLogKeys,
  type SmsLogPageQuery,
  type SmsLogQuery,
  type SmsLogResp,
  type SmsLogStatus
} from '@/lib/api/sms-log'
import { dataTableFeatures } from '@/lib/data-table-features'

import { createSmsLogColumns, SMS_LOG_COLUMN_LABELS } from './sms-log-columns'
import { SmsLogDeleteDialog } from './sms-log-delete-dialog'
import { SmsLogTable } from './sms-log-table'

const EMPTY_ROWS: SmsLogResp[] = []

/** Newest first; the log table has no alias in its queries, so the plain column works. */
const DEFAULT_SORT = 'id,desc'

const STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: '1', label: '成功' },
  { value: '2', label: '失败' }
]

export function SmsLogList() {
  const { hasPermission } = usePermission()
  const canDelete = hasPermission('system:smsLog:delete')
  const canExport = hasPermission('system:smsLog:export')
  const fullscreen = useFullscreenTransition()
  const { isExporting, exportData } = useExport<SmsLogQuery>(exportSmsLogs)

  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({})
  const [configId, setConfigId] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [status, setStatus] = React.useState<SmsLogStatus | undefined>(undefined)
  const [deletingLog, setDeletingLog] = React.useState<SmsLogResp | null>(null)

  const resetPage = () => {
    setPagination(current => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
  }

  const handleConfigIdSearch = (next: string) => {
    setConfigId(next)
    resetPage()
  }

  const handlePhoneSearch = (next: string) => {
    setPhone(next)
    resetPage()
  }

  const handleStatusChange = (value: string | null) => {
    setStatus(value === '1' ? 1 : value === '2' ? 2 : undefined)
    resetPage()
  }

  const handleDelete = React.useCallback((log: SmsLogResp) => {
    setDeletingLog(log)
  }, [])

  // `configId` reaches the backend as a Long, so a box without digits must not be sent.
  const configIdFilter = /^\d+$/.test(configId) ? configId : undefined

  const queryFilters: SmsLogQuery = {
    sort: DEFAULT_SORT,
    configId: configIdFilter,
    phone: phone || undefined,
    status
  }
  const params: SmsLogPageQuery = { page: pagination.pageIndex + 1, size: pagination.pageSize, ...queryFilters }

  const query = useQuery({
    queryKey: smsLogKeys.list(params),
    queryFn: ({ signal }) => listSmsLogs(params, signal),
    placeholderData: keepPreviousData
  })

  const total = query.data?.total ?? 0
  const rowOffset = pagination.pageIndex * pagination.pageSize

  usePageClamp(total, pagination, setPagination)

  const columns = React.useMemo(
    () => createSmsLogColumns({ rowOffset, canDelete, onDelete: handleDelete }),
    [rowOffset, canDelete, handleDelete]
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
        className="col-span-2 h-8 w-full md:w-44"
        clearable
        placeholder="搜索配置 ID"
        onSearch={handleConfigIdSearch}
      />
      <TableSearch
        className="col-span-2 h-8 w-full md:w-48"
        clearable
        placeholder="搜索手机号"
        onSearch={handlePhoneSearch}
      />
      <FilterSelect
        label="状态"
        options={STATUS_OPTIONS}
        value={status === undefined ? 'all' : String(status)}
        onValueChange={handleStatusChange}
        className="w-full sm:w-32"
      />
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
      columnLabels={SMS_LOG_COLUMN_LABELS}
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
      <ListPageCard
        title="短信日志"
        description="查看短信发送记录、发送状态与短信服务商返回数据"
        filters={filters}
        actions={actions}
        fullscreen={fullscreen}
      >
        <SmsLogTable
          table={table}
          isLoading={query.isPending}
          isError={query.isError}
          isShowingPreviousRows={query.isPlaceholderData}
          onRetry={() => void query.refetch()}
        />
      </ListPageCard>

      <SmsLogDeleteDialog log={deletingLog} open={deletingLog !== null} onClose={() => setDeletingLog(null)} />
    </>
  )
}
