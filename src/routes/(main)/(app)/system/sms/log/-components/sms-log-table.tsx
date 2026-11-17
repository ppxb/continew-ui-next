import type { ReactTable } from '@tanstack/react-table'

import { DataTable } from '@/components/data-table'
import type { SmsLogResp } from '@/lib/api/sms-log'
import type { DataTableFeatures } from '@/lib/data-table-features'

interface SmsLogTableProps {
  readonly table: ReactTable<DataTableFeatures, SmsLogResp>
  readonly isLoading: boolean
  readonly isError: boolean
  readonly isShowingPreviousRows: boolean
  readonly onRetry?: () => void
  readonly fillHeight?: boolean
}

export function SmsLogTable({ table, ...rest }: SmsLogTableProps) {
  return <DataTable table={table} {...rest} />
}
