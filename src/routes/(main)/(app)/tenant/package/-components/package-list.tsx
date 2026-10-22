import * as React from 'react'

import { useQuery } from '@tanstack/react-query'
import { type ColumnVisibilityState, type PaginationState, useTable } from '@tanstack/react-table'

import { RotateCcw } from 'lucide-react'

import { ListPageCard } from '@/components/list-page-card'
import { TableSearch } from '@/components/table-search'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'
import { usePermission } from '@/hooks/use-permission'
import {
  listPackages,
  packageKeys,
  type PackagePageQuery,
  type PackageResp,
  type PackageStatus
} from '@/lib/api/package'
import { dataTableFeatures } from '@/lib/data-table-features'

import { createPackageColumns, type PackageAction } from './package-columns'
import { PackageDeleteDialog } from './package-delete-dialog'
import { PackageDetailDrawer } from './package-detail-drawer'
import { PackageFormDrawer } from './package-form-drawer'
import { PackageTable } from './package-table'
import { PackageToolbar } from './package-toolbar'

const EMPTY_ROWS: PackageResp[] = []

/** Newest first; the package table has no alias in its queries. */
const DEFAULT_SORT = 'createTime,desc'

const HIDDEN_BY_DEFAULT: ColumnVisibilityState = {
  createUserString: false,
  updateUserString: false,
  updateTime: false
}

const STATUS_ITEMS = [
  { value: 'all', label: '全部状态' },
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
  // The search box owns its text, so resetting the filters remounts it.
  const [searchVersion, setSearchVersion] = React.useState(0)
  // One state per overlay: a null value means it is closed. The form drawer holds an object,
  // because a null id there means 新增.
  const [detailId, setDetailId] = React.useState<string | number | null>(null)
  const [formTarget, setFormTarget] = React.useState<{ packageId: string | number | null } | null>(null)
  const [deletingPackage, setDeletingPackage] = React.useState<PackageResp | null>(null)

  const goToFirstPage = React.useCallback(() => {
    setPagination(current => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
  }, [])

  const handleKeywordSearch = React.useCallback(
    (next: string) => {
      setKeyword(next)
      goToFirstPage()
    },
    [goToFirstPage]
  )

  const handleStatusChange = React.useCallback(
    (value: string | null) => {
      setStatus(!value || value === 'all' ? undefined : (Number(value) as PackageStatus))
      goToFirstPage()
    },
    [goToFirstPage]
  )

  const handleReset = React.useCallback(() => {
    setKeyword('')
    setStatus(undefined)
    setSearchVersion(current => current + 1)
    goToFirstPage()
  }, [goToFirstPage])

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
    placeholderData: previous => previous
  })

  const total = query.data?.total ?? 0
  const rowOffset = pagination.pageIndex * pagination.pageSize

  React.useEffect(() => {
    if (total > 0 && pagination.pageIndex * pagination.pageSize >= total) {
      const maxPageIndex = Math.max(0, Math.ceil(total / pagination.pageSize) - 1)
      setPagination(current => ({ ...current, pageIndex: maxPageIndex }))
    }
  }, [total, pagination.pageIndex, pagination.pageSize])

  const columns = React.useMemo(
    () =>
      createPackageColumns({
        rowOffset,
        canGet,
        canUpdate,
        canDelete,
        onAction: handleAction
      }),
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
        key={`keyword-${searchVersion}`}
        clearable
        className="col-span-2 h-8 w-full sm:w-64"
        placeholder="搜索名称、描述"
        onSearch={handleKeywordSearch}
      />
      <div className="w-full sm:w-32">
        <Select
          items={STATUS_ITEMS}
          value={status === undefined ? 'all' : String(status)}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-full">
            <span className="text-muted-foreground">状态</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectGroup>
              {STATUS_ITEMS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <Button type="button" variant="ghost" onClick={handleReset}>
        <RotateCcw />
        重置
      </Button>
    </>
  )

  const actions = (
    <PackageToolbar
      table={table}
      isRefreshing={query.isFetching && !query.isPending}
      isFullscreen={fullscreen.isFullscreen}
      canCreate={canCreate}
      onCreate={() => setFormTarget({ packageId: null })}
      onRefresh={() => void query.refetch()}
      onToggleFullscreen={fullscreen.toggleFullscreen}
      onResetColumns={() => setColumnVisibility(HIDDEN_BY_DEFAULT)}
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
