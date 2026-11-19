import * as React from 'react'

import { toast } from '@/components/ui/toast'
import { reportError } from '@/lib/http'

/** Runs a table export with a single in-flight state and the standard success toast. */
export function useExport<TParams>(
  exportFn: (params: TParams) => Promise<void>,
  successMessage = '导出已开始，请留意浏览器下载'
) {
  const [isExporting, setIsExporting] = React.useState(false)

  const exportData = async (params: TParams) => {
    setIsExporting(true)

    try {
      await exportFn(params)
      toast.add({ title: successMessage, type: 'success' })
    } catch (error) {
      // HTTP-layer failures already toasted; this covers blob()/other non-HTTP errors.
      reportError(error, '导出失败，请重试')
    } finally {
      setIsExporting(false)
    }
  }

  return { isExporting, exportData }
}
