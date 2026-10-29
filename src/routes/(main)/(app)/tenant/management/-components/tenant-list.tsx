import * as React from 'react'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { type ColumnVisibilityState, type PaginationState, useTable } from '@tanstack/react-table'

import { Plus } from 'lucide-react'

import { DataTable } from '@/components/data-table'
import { FilterSelect } from '@/components/filter-select'
import { ListPageCard } from '@/components/list-page-card'
import { TableSearch } from '@/components/table-search'
import { TableToolbar } from '@/components/table-toolbar'
import { Button } from '@/components/ui/button'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'
import { usePageClamp } from '@/hooks/use-page-clamp'
import { usePermission } from '@/hooks/use-permission'
import { listPackageDict, packageKeys } from '@/lib/api/package'
import { listTenants, tenantKeys, type TenantPageQuery, type TenantResp } from '@/lib/api/tenant'
import { dataTableFeatures } from '@/lib/data-table-features'

import { createTenantColumns, type TenantAction } from './tenant-columns'
import { TenantAdminPasswordDialog } from './tenant-admin-password-dialog'
import { TenantDeleteDialog } from './tenant-delete-dialog'
import { TenantDetailDrawer } from './tenant-detail-drawer'
import { TenantFormDrawer } from './tenant-form-drawer'

const EMPTY_ROWS: TenantResp[] = []

/** Newest first; the tenant table has no alias in its queries. */
const DEFAULT_SORT = 'createTime,desc'

const HIDDEN_BY_DEFAULT: ColumnVisibilityState = {
  createUserString: false,
  updateUserString: false,
  updateTime: false
}

/** One width per column id, so the hidden columns cannot shift the placeholder shapes. */
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

/** Packages barely change, so the filter and the form share one cached lookup. */
const LOOKUP_STALE_MS = 5 * 60_000

export function TenantList() {
  const { hasPermission } = usePermission()
  const canCreate = hasPermission('tenant:management:create')
  const canGet = hasPermission('tenant:management:get')
  const canUpdate = hasPermission('tenant:management:update')
  const canDelete = hasPermission('tenant:management:delete')
  const canUpdateAdminPassword = hasPermission('tenant:management:updateAdminUserPwd')
  const fullscreen = useFullscreenTransition()

  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>(HIDDEN_BY_DEFAULT)
  const [keyword, setKeyword] = React.useState('')
  const [packageId, setPackageId] = React.useState<string | undefined>(undefined)
  // A null value means the overlay is closed; the form drawer holds an object so a null id means 新增.
  const [detailId, setDetailId] = React.useState<string | number | null>(null)
  const [formTarget, setFormTarget] = React.useState<{ tenantId: string | number | null } | null>(null)
  const [passwordTenant, setPasswordTenant] = React.useState<TenantResp | null>(null)
  const [deletingTenant, setDeletingTenant] = React.useState<TenantResp | null>(null)

  const packages = useQuery({
    queryKey: packageKeys.dicts(),
    queryFn: ({ signal }) => listPackageDict(signal),
    staleTime: LOOKUP_STALE_MS
  })

  const packageItems = [
    { value: 'all', label: '全部' },
    ...(packages.data ?? []).map(option => ({ value: String(option.value), label: option.label }))
  ]

  const goToFirstPage = () => {
    setPagination(current => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
  }

  const handleKeywordSearch = (next: string) => {
    setKeyword(next)
    goToFirstPage()
  }

  const handlePackageChange = (value: string | null) => {
    setPackageId(!value || value === 'all' ? undefined : value)
    goToFirstPage()
  }

  const handleAction = React.useCallback((action: TenantAction, tenant: TenantResp) => {
    if (action === 'detail') {
      setDetailId(tenant.id)
      return
    }

    if (action === 'edit') {
      setFormTarget({ tenantId: tenant.id })
      return
    }

    if (action === 'adminPassword') {
      setPasswordTenant(tenant)
      return
    }

    setDeletingTenant(tenant)
  }, [])

  const params: TenantPageQuery = {
    page: pagination.pageIndex + 1,
    size: pagination.pageSize,
    sort: DEFAULT_SORT,
    description: keyword || undefined,
    packageId
  }

  const query = useQuery({
    queryKey: tenantKeys.list(params),
    queryFn: ({ signal }) => listTenants(params, signal),
    placeholderData: keepPreviousData
  })

  const total = query.data?.total ?? 0
  const rowOffset = pagination.pageIndex * pagination.pageSize

  usePageClamp(total, pagination, setPagination)

  const columns = React.useMemo(
    () =>
      createTenantColumns({
        rowOffset,
        canGet,
        canUpdate,
        canUpdateAdminPassword,
        canDelete,
        onAction: handleAction
      }),
    [rowOffset, canGet, canUpdate, canUpdateAdminPassword, canDelete, handleAction]
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
        clearable
        className="col-span-2 h-8 w-full sm:w-64"
        placeholder="搜索名称、描述"
        onSearch={handleKeywordSearch}
      />
      <FilterSelect
        label="套餐"
        options={packageItems}
        value={packageId ?? 'all'}
        onValueChange={handlePackageChange}
        className="w-full sm:w-40"
      />
    </>
  )

  const actions = (
    <TableToolbar
      table={table}
      columnLabels={{ status: '状态' }}
      isRefreshing={query.isFetching && !query.isPending}
      isFullscreen={fullscreen.isFullscreen}
      onRefresh={() => void query.refetch()}
      onToggleFullscreen={fullscreen.toggleFullscreen}
      onResetColumns={() => setColumnVisibility(HIDDEN_BY_DEFAULT)}
      actions={
        canCreate ? (
          <Button onClick={() => setFormTarget({ tenantId: null })}>
            <Plus />
            新增租户
          </Button>
        ) : null
      }
    />
  )

  return (
    <>
      <ListPageCard
        title="租户管理"
        description="管理租户、套餐关联与租户管理员账号"
        filters={filters}
        actions={actions}
        fullscreen={fullscreen}
      >
        <DataTable
          table={table}
          skeletonWidths={table.getVisibleLeafColumns().map(column => SKELETON_WIDTHS[column.id] ?? 'w-24')}
          isLoading={query.isPending}
          isError={query.isError}
          isShowingPreviousRows={query.isPlaceholderData}
          onRetry={() => void query.refetch()}
        />
      </ListPageCard>

      <TenantDetailDrawer tenantId={detailId} open={detailId !== null} onClose={() => setDetailId(null)} />
      <TenantFormDrawer
        tenantId={formTarget?.tenantId ?? null}
        open={formTarget !== null}
        onClose={() => setFormTarget(null)}
      />
      <TenantAdminPasswordDialog
        tenant={passwordTenant}
        open={passwordTenant !== null}
        onClose={() => setPasswordTenant(null)}
      />
      <TenantDeleteDialog
        tenant={deletingTenant}
        open={deletingTenant !== null}
        onClose={() => setDeletingTenant(null)}
      />
    </>
  )
}
