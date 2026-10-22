import type { ReactTable } from '@tanstack/react-table'

import { DataTable } from '@/components/data-table'
import type { JobLogResp } from '@/lib/api/job-log'
import type { DataTableFeatures } from '@/lib/data-table-features'

/** One skeleton width per column id, so hidden columns cannot shift the placeholder shapes. */
const SKELETON_WIDTHS: Record<string, string> = {
  index: 'mx-auto w-6',
  groupName: 'w-28',
  jobName: 'w-32',
  createDt: 'w-32',
  taskBatchStatus: 'mx-auto w-16 rounded-full',
  operationReason: 'w-28',
  executionAt: 'w-32',
  actions: 'mx-auto w-8'
}

interface JobLogTableProps {
  readonly table: ReactTable<DataTableFeatures, JobLogResp>
  readonly isLoading: boolean
  readonly isError: boolean
  readonly isShowingPreviousRows: boolean
  readonly onRetry?: () => void
}

/** The scheduled task log table: only its skeleton shapes are screen-specific. */
export function JobLogTable({ table, ...rest }: JobLogTableProps) {
  return (
    <DataTable
      table={table}
      {...rest}
      skeletonWidths={table.getVisibleLeafColumns().map(column => SKELETON_WIDTHS[column.id] ?? 'w-24')}
    />
  )
}
