import * as React from 'react'

import { Download } from 'lucide-react'

import { ProTable, type ProFormInstance } from '@/components/pro'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useExport } from '@/hooks/use-export'
import { usePermission } from '@/hooks/use-permission'
import {
  exportLoginLogs,
  exportOperationLogs,
  listLogs,
  logKeys,
  type LogExportQuery,
  type LogResp
} from '@/lib/api/log'
import { createRecentDateRange } from '@/lib/date-range'

import { createOperationLogColumns, loginLogColumns, type LogRecord, type LogSearchValues } from './log-columns'
import { LogDetailDrawer } from './log-detail-drawer'

const DEFAULT_SORT = 't1.create_time,desc'

interface LogListProps {
  readonly mode: 'login' | 'operation'
}

export function LogList({ mode }: LogListProps) {
  const isLogin = mode === 'login'
  const { hasPermission } = usePermission()
  const canExport = hasPermission('monitor:log:export')
  const canViewDetail = hasPermission('monitor:log:get')
  const formRef = React.useRef<ProFormInstance<LogSearchValues>>(undefined)
  const [initialValues] = React.useState(() => ({ dateRange: createRecentDateRange() }))
  const { isExporting, exportData } = useExport<LogExportQuery>(isLogin ? exportLoginLogs : exportOperationLogs)
  // Keep the selected record while the detail drawer's close animation runs.
  const [detailView, setDetailView] = React.useState<{ id: string | number | null; open: boolean }>({
    id: null,
    open: false
  })
  const handleDetail = React.useCallback((log: LogResp) => setDetailView({ id: log.id, open: true }), [])
  const columns = React.useMemo(
    () => (isLogin ? loginLogColumns : createOperationLogColumns({ canViewDetail, onDetail: handleDetail })),
    [isLogin, canViewDetail, handleDetail]
  )
  const module = isLogin ? '登录' : undefined

  return (
    <>
      <ProTable<LogRecord, LogSearchValues>
        rowKey="id"
        columns={columns}
        queryKey={[...logKeys.lists(), mode]}
        params={{ module }}
        formRef={formRef}
        form={{ initialValues }}
        options={{ search: { name: 'createUserString', placeholder: isLogin ? '搜索登录用户' : '搜索操作人' } }}
        request={async ({ current, pageSize, dateRange: _dateRange, ...filters }, _sort, _filter, signal) => {
          const page = await listLogs({ ...filters, page: current, size: pageSize, sort: DEFAULT_SORT }, signal)
          return { data: page.list, total: page.total }
        }}
        toolBarRender={() =>
          canExport
            ? [
                <Button
                  key="export"
                  variant="outline"
                  disabled={isExporting}
                  onClick={() =>
                    void exportData({ ...formRef.current?.getFieldsFormatValue(), module, sort: DEFAULT_SORT })
                  }
                >
                  {isExporting ? <Spinner /> : <Download />}导出
                </Button>
              ]
            : []
        }
      />
      {!isLogin && canViewDetail ? (
        <LogDetailDrawer
          logId={detailView.id}
          open={detailView.open}
          onClose={() => setDetailView(previous => ({ ...previous, open: false }))}
        />
      ) : null}
    </>
  )
}
