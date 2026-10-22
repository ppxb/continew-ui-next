import type { ReactTable } from '@tanstack/react-table'

import { DataTable } from '@/components/data-table'
import type { JobResp } from '@/lib/api/job'
import type { DataTableFeatures } from '@/lib/data-table-features'

/** One skeleton width per column id, so hidden columns cannot shift the placeholder shapes. */
const SKELETON_WIDTHS: Record<string, string> = {
  index: 'mx-auto w-6',
  jobName: 'w-32',
  triggerType: 'w-32',
  taskType: 'w-28',
  jobStatus: 'mx-auto w-10 rounded-full',
  description: 'w-32',
  createDt: 'w-32',
  updateDt: 'w-32',
  actions: 'mx-auto w-8'
}

interface JobTableProps {
  readonly table: ReactTable<DataTableFeatures, JobResp>
  readonly isLoading: boolean
  readonly isError: boolean
  readonly isShowingPreviousRows: boolean
  readonly onRetry?: () => void
}

/** The scheduled task table: only its skeleton shapes are screen-specific. */
export function JobTable({ table, ...rest }: JobTableProps) {
  return (
    <DataTable
      table={table}
      {...rest}
      skeletonWidths={table.getVisibleLeafColumns().map(column => SKELETON_WIDTHS[column.id] ?? 'w-24')}
    />
  )
}
