import type { ReactTable } from '@tanstack/react-table'

import { DataTable } from '@/components/data-table'
import type { TenantResp } from '@/lib/api/tenant'
import type { DataTableFeatures } from '@/lib/data-table-features'

/** One skeleton width per column id, so hidden columns cannot shift the placeholder shapes. */
const SKELETON_WIDTHS: Record<string, string> = {
  index: 'mx-auto w-6',
  code: 'w-28',
  name: 'w-32',
  packageName: 'w-24',
  domain: 'w-32',
  expireTime: 'w-32',
  adminUsername: 'w-24',
  status: 'mx-auto w-14 rounded-full',
  description: 'w-32',
  createUserString: 'w-20',
  createTime: 'w-32',
  updateUserString: 'w-20',
  updateTime: 'w-32',
  actions: 'mx-auto w-8'
}

interface TenantTableProps {
  readonly table: ReactTable<DataTableFeatures, TenantResp>
  readonly isLoading: boolean
  readonly isError: boolean
  readonly isShowingPreviousRows: boolean
  readonly onRetry?: () => void
}

/** The tenant table: only its skeleton shapes are screen-specific. */
export function TenantTable({ table, ...rest }: TenantTableProps) {
  return (
    <DataTable
      table={table}
      {...rest}
      skeletonWidths={table.getVisibleLeafColumns().map(column => SKELETON_WIDTHS[column.id] ?? 'w-24')}
    />
  )
}
