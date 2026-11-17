import type { ReactTable } from '@tanstack/react-table'

import { DataTable } from '@/components/data-table'
import type { LogResp } from '@/lib/api/log'
import type { DataTableFeatures } from '@/lib/data-table-features'

interface LogTableProps {
  readonly table: ReactTable<DataTableFeatures, LogResp>
  readonly isLoading: boolean
  readonly isError: boolean
  readonly isShowingPreviousRows: boolean
  readonly onRetry?: () => void
  readonly fillHeight?: boolean
}

export function LogTable({ table, ...rest }: LogTableProps) {
  return <DataTable table={table} {...rest} />
}
