import type { ReactTable } from '@tanstack/react-table'

import { DataTable } from '@/components/data-table'
import type { PackageResp } from '@/lib/api/package'
import type { DataTableFeatures } from '@/lib/data-table-features'

interface PackageTableProps {
  readonly table: ReactTable<DataTableFeatures, PackageResp>
  readonly isLoading: boolean
  readonly isError: boolean
  readonly isShowingPreviousRows: boolean
  readonly onRetry?: () => void
  readonly fillHeight?: boolean
}

export function PackageTable({ table, ...rest }: PackageTableProps) {
  return <DataTable table={table} {...rest} />
}
