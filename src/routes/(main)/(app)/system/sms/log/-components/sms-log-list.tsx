import * as React from 'react'

import { useQuery } from '@tanstack/react-query'
import { type ColumnVisibilityState, type PaginationState, useTable } from '@tanstack/react-table'

import { cn } from 'cn'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/toast'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'
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

import { createSmsLogColumns } from './sms-log-columns'
import { SmsLogDeleteDialog } from './sms-log-delete-dialog'
import { SmsLogTable } from './sms-log-table'
import { SmsLogToolbar } from './sms-log-toolbar'

const EMPTY_ROWS: SmsLogResp[] = []

/** Newest first; the log table has no alias in its queries, so the plain column works. */
const DEFAULT_SORT = 'id,desc'

export function SmsLogList() {
  const { hasPermission } = usePermission()
  const canDelete = hasPermission('system:smsLog:delete')
  const canExport = hasPermission('system:smsLog:export')
  const { isFullscreen, reservedHeight, fullscreenRef, spacerRef, toggleFullscreen } = useFullscreenTransition()

  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({})
  const [configId, setConfigId] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [status, setStatus] = React.useState<SmsLogStatus | undefined>(undefined)
  // The search boxes own their text, so resetting the filters remounts them.
  const [searchVersion, setSearchVersion] = React.useState(0)
  const [isExporting, setIsExporting] = React.useState(false)
  const [deletingLog, setDeletingLog] = React.useState<SmsLogResp | null>(null)

  const goToFirstPage = React.useCallback(() => {
    setPagination(current => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
  }, [])

  const handleConfigIdSearch = React.useCallback(
    (next: string) => {
      setConfigId(next)
      goToFirstPage()
    },
    [goToFirstPage]
  )

  const handlePhoneSearch = React.useCallback(
    (next: string) => {
      setPhone(next)
      goToFirstPage()
    },
    [goToFirstPage]
  )

  const handleStatusChange = React.useCallback(
    (value: string | null) => {
      setStatus(!value || value === 'all' ? undefined : (Number(value) as SmsLogStatus))
      goToFirstPage()
    },
    [goToFirstPage]
  )

  const handleReset = React.useCallback(() => {
    setConfigId('')
    setPhone('')
    setStatus(undefined)
    setSearchVersion(current => current + 1)
    goToFirstPage()
  }, [goToFirstPage])

  const handleDelete = React.useCallback((log: SmsLogResp) => {
    setDeletingLog(log)
  }, [])

  // `configId` reaches the backend as a Long, so a box without digits must not be sent.
  const configIdFilter = /^\d+$/.test(configId) ? configId : undefined

  const filters: SmsLogQuery = {
    sort: DEFAULT_SORT,
    configId: configIdFilter,
    phone: phone || undefined,
    status
  }
  const params: SmsLogPageQuery = { page: pagination.pageIndex + 1, size: pagination.pageSize, ...filters }

  const query = useQuery({
    queryKey: smsLogKeys.list(params),
    queryFn: () => listSmsLogs(params),
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

  const handleExport = async () => {
    setIsExporting(true)

    try {
      await exportSmsLogs(filters)
      toast.add({ title: '导出已开始，请留意浏览器下载', type: 'success' })
    } catch {
      // The HTTP layer already reported the failure.
    } finally {
      setIsExporting(false)
    }
  }

  const tableSection = (
    <>
      <SmsLogToolbar
        table={table}
        isRefreshing={query.isFetching && !query.isPending}
        isExporting={isExporting}
        isFullscreen={isFullscreen}
        canExport={canExport}
        searchVersion={searchVersion}
        status={status}
        onConfigIdSearch={handleConfigIdSearch}
        onPhoneSearch={handlePhoneSearch}
        onStatusChange={handleStatusChange}
        onReset={handleReset}
        onExport={() => void handleExport()}
        onRefresh={() => void query.refetch()}
        onToggleFullscreen={toggleFullscreen}
        onResetColumns={() => setColumnVisibility({})}
      />

      <SmsLogTable
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
        <CardHeader className="border-b">
          <CardTitle className="text-xl leading-none">短信日志</CardTitle>
          <CardDescription className="max-w-sm leading-snug">
            查看短信发送记录、发送状态与短信服务商返回数据
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 px-0">
          {isFullscreen ? <div ref={spacerRef} style={{ height: reservedHeight }} /> : null}

          <div ref={fullscreenRef} className={cn('flex flex-col gap-4', isFullscreen && 'bg-background')}>
            {tableSection}
          </div>
        </CardContent>
      </Card>

      <SmsLogDeleteDialog log={deletingLog} open={deletingLog !== null} onClose={() => setDeletingLog(null)} />
    </>
  )
}
