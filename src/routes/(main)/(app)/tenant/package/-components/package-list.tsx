import * as React from 'react'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { type ColumnVisibilityState, type PaginationState, useTable } from '@tanstack/react-table'
import { Plus } from 'lucide-react'

import { FilterSelect } from '@/components/filter-select'
import { ListPageCard } from '@/components/list-page-card'
import { TableSearch } from '@/components/table-search'
import { TableToolbar } from '@/components/table-toolbar'
import { Button } from '@/components/ui/button'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'
import { usePageClamp } from '@/hooks/use-page-clamp'
import { usePermission } from '@/hooks/use-permission'
import {
  listPackages,
  packageKeys,
  type PackagePageQuery,
  type PackageResp,
  type PackageStatus
} from '@/lib/api/package'
import { dataTableFeatures } from '@/lib/data-table-features'

import { createPackageColumns, PACKAGE_COLUMN_LABELS, type PackageAction } from './package-columns'
import { PackageDeleteDialog } from './package-delete-dialog'
import { PackageDetailDrawer } from './package-detail-drawer'
import { PackageFormDrawer } from './package-form-drawer'
import { PackageTable } from './package-table'

const EMPTY_ROWS: PackageResp[] = []

/** Newest first; the package table has no alias in its queries. */
const DEFAULT_SORT = 'createTime,desc'

const HIDDEN_BY_DEFAULT: ColumnVisibilityState = {
  createUserString: false,
  updateUserString: false,
  updateTime: false
}

const STATUS_ITEMS = [
  { value: 'all', label: '全部' },
  { value: '1', label: '启用' },
  { value: '2', label: '禁用' }
]

export function PackageList() {
  const { hasPermission } = usePermission()
  const canCreate = hasPermission('tenant:package:create')
  const canGet = hasPermission('tenant:package:get')
  const canUpdate = hasPermission('tenant:package:update')
  const canDelete = hasPermission('tenant:package:delete')
  const fullscreen = useFullscreenTransition()

  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>(HIDDEN_BY_DEFAULT)
  const [keyword, setKeyword] = React.useState('')
  const [status, setStatus] = React.useState<PackageStatus | undefined>(undefined)
  // One state per overlay: a null value means it is closed. The form drawer holds an object,
  // because a null id there means 新增.
  const [detailId, setDetailId] = React.useState<string | number | null>(null)
  const [formTarget, setFormTarget] = React.useState<{ packageId: string | number | null } | null>(null)
  const [deletingPackage, setDeletingPackage] = React.useState<PackageResp | null>(null)

  const resetPage = () => {
    setPagination(current => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
  }

  const handleKeywordSearch = (next: string) => {
    setKeyword(next)
    resetPage()
  }

  const handleStatusChange = (value: string | null) => {
    setStatus(value === '1' ? 1 : value === '2' ? 2 : undefined)
    resetPage()
  }

  const handleAction = React.useCallback((action: PackageAction, pkg: PackageResp) => {
    if (action === 'detail') {
      setDetailId(pkg.id)
      return
    }

    if (action === 'edit') {
      setFormTarget({ packageId: pkg.id })
      return
    }

    setDeletingPackage(pkg)
  }, [])

  const params: PackagePageQuery = {
    page: pagination.pageIndex + 1,
    size: pagination.pageSize,
    sort: DEFAULT_SORT,
    description: keyword || undefined,
    status
  }

  const query = useQuery({
    queryKey: packageKeys.list(params),
    queryFn: ({ signal }) => listPackages(params, signal),
    placeholderData: keepPreviousData
  })

  const total = query.data?.total ?? 0
  const rowOffset = pagination.pageIndex * pagination.pageSize

  usePageClamp(total, pagination, setPagination)

  const columns = React.useMemo(
    () => createPackageColumns({ rowOffset, canGet, canUpdate, canDelete, onAction: handleAction }),
    [rowOffset, canGet, canUpdate, canDelete, handleAction]
  )

  const table = useTable({
    features: dataTableFeatures,
    data: query.data?.list ?? EMPTY_ROWS,
    columns,
    state: { columnVisibility, pagination },
    manualPagination: true,
    rowCount: total,
    pageCount: Math.max(Math.ceil(total / pagination.pageSize), 1),
    autoResetPageIndex: false,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getRowId: row => String(row.id)
  })

  const filters = (
    <>
      <TableSearch
        className="col-span-2 h-8 w-full sm:w-64"
        clearable
        placeholder="搜索名称、描述"
        onSearch={handleKeywordSearch}
      />
      <FilterSelect
        label="状态"
        options={STATUS_ITEMS}
        value={status === undefined ? 'all' : String(status)}
        onValueChange={handleStatusChange}
        className="w-full sm:w-32"
      />
    </>
  )

  const actions = (
    <TableToolbar
      table={table}
      className="w-full xl:w-auto xl:justify-end"
      isRefreshing={query.isFetching && !query.isPending}
      isFullscreen={fullscreen.isFullscreen}
      onRefresh={() => void query.refetch()}
      onToggleFullscreen={fullscreen.toggleFullscreen}
      onResetColumns={() => setColumnVisibility(HIDDEN_BY_DEFAULT)}
      columnLabels={PACKAGE_COLUMN_LABELS}
      actions={
        canCreate ? (
          <Button onClick={() => setFormTarget({ packageId: null })}>
            <Plus />
            新增套餐
          </Button>
        ) : null
      }
    />
  )

  return (
    <>
      <ListPageCard
        title="套餐管理"
        description="管理租户可用的套餐与菜单授权"
        filters={filters}
        actions={actions}
        fullscreen={fullscreen}
      >
        <PackageTable
          table={table}
          isLoading={query.isPending}
          isError={query.isError}
          isShowingPreviousRows={query.isPlaceholderData}
          onRetry={() => void query.refetch()}
        />
      </ListPageCard>

      <PackageDetailDrawer packageId={detailId} open={detailId !== null} onClose={() => setDetailId(null)} />
      <PackageFormDrawer
        packageId={formTarget?.packageId ?? null}
        open={formTarget !== null}
        onClose={() => setFormTarget(null)}
      />
      <PackageDeleteDialog
        pkg={deletingPackage}
        open={deletingPackage !== null}
        onClose={() => setDeletingPackage(null)}
      />
    </>
  )
}
