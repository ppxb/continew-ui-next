import * as React from 'react'

import { Download } from 'lucide-react'

import { ProTable, type ProFormInstance } from '@/components/pro'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useExport } from '@/hooks/use-export'
import { usePermission } from '@/hooks/use-permission'
import { exportSmsLogs, listSmsLogs, smsLogKeys, type SmsLogQuery, type SmsLogResp } from '@/lib/api/sms-log'

import { createSmsLogColumns } from './sms-log-columns'
import { SmsLogDeleteDialog } from './sms-log-delete-dialog'

const DEFAULT_SORT = 'id,desc'

export function SmsLogList() {
  const { hasPermission } = usePermission()
  const canDelete = hasPermission('system:smsLog:delete')
  const canExport = hasPermission('system:smsLog:export')
  const formRef = React.useRef<ProFormInstance<SmsLogQuery>>(undefined)
  const { isExporting, exportData } = useExport<SmsLogQuery>(exportSmsLogs)
  const [deletingLog, setDeletingLog] = React.useState<SmsLogResp | null>(null)
  const columns = React.useMemo(() => createSmsLogColumns({ canDelete, onDelete: setDeletingLog }), [canDelete])

  return (
    <>
      <ProTable<SmsLogResp, SmsLogQuery>
        headerTitle="短信日志"
        toolbar={{ subTitle: '查看和管理短信发送记录' }}
        rowKey="id"
        columns={columns}
        queryKey={smsLogKeys.lists()}
        formRef={formRef}
        request={async ({ current, pageSize, ...filters }, _sort, _filter, signal) => {
          const page = await listSmsLogs({ ...filters, page: current, size: pageSize, sort: DEFAULT_SORT }, signal)
          return { data: page.list, total: page.total }
        }}
        toolBarRender={() =>
          canExport
            ? [
                <Button
                  key="export"
                  variant="outline"
                  disabled={isExporting}
                  onClick={() => void exportData({ ...formRef.current?.getFieldsFormatValue(), sort: DEFAULT_SORT })}
                >
                  {isExporting ? <Spinner /> : <Download />}导出
                </Button>
              ]
            : []
        }
      />
      <SmsLogDeleteDialog log={deletingLog} open={deletingLog !== null} onClose={() => setDeletingLog(null)} />
    </>
  )
}
