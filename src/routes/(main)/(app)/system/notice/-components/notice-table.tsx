import type { ReactTable } from '@tanstack/react-table'

import { DataTable } from '@/components/data-table'
import type { NoticeResp } from '@/lib/api/notice'
import type { DataTableFeatures } from '@/lib/data-table-features'

/** One skeleton width per column, in the same order as the columns. */
const SKELETON_WIDTHS = [
  'mx-auto w-6',
  'w-40',
  'w-16',
  'mx-auto w-16',
  'w-24',
  'mx-auto w-12 rounded-full',
  'mx-auto w-10',
  'mx-auto w-20',
  'w-28'
]

interface NoticeTableProps {
  readonly table: ReactTable<DataTableFeatures, NoticeResp>
  readonly isLoading: boolean
  readonly isError: boolean
  readonly isShowingPreviousRows: boolean
  readonly onRetry?: () => void
}

/** The announcement table: only its skeleton shapes are screen-specific. */
export function NoticeTable({ table, ...rest }: NoticeTableProps) {
  return <DataTable table={table} {...rest} skeletonWidths={SKELETON_WIDTHS} />
}
