import type { ReactTable } from '@tanstack/react-table'

import { DataTable } from '@/components/data-table'
import type { OnlineUserResp } from '@/lib/api/online'
import type { DataTableFeatures } from '@/lib/data-table-features'

interface OnlineUserTableProps {
  readonly table: ReactTable<DataTableFeatures, OnlineUserResp>
  readonly isLoading: boolean
  readonly isError: boolean
  readonly isShowingPreviousRows: boolean
  readonly onRetry?: () => void
  readonly fillHeight?: boolean
}

export function OnlineUserTable({ table, ...rest }: OnlineUserTableProps) {
  return <DataTable table={table} {...rest} />
}
