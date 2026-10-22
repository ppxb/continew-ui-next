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
import { listPackageDict, packageKeys } from '@/lib/api/package'
import { listTenants, tenantKeys, type TenantPageQuery, type TenantResp } from '@/lib/api/tenant'
import { dataTableFeatures } from '@/lib/data-table-features'

import { createTenantColumns, type TenantAction } from './tenant-columns'
import { TenantAdminPasswordDialog } from './tenant-admin-password-dialog'
import { TenantDeleteDialog } from './tenant-delete-dialog'
import { TenantDetailDrawer } from './tenant-detail-drawer'
import { TenantFormDrawer } from './tenant-form-drawer'
import { TenantTable } from './tenant-table'
import { TenantToolbar } from './tenant-toolbar'

const EMPTY_ROWS: TenantResp[] = []

/** Newest first; the tenant table has no alias in its queries. */
const DEFAULT_SORT = 'createTime,desc'

const HIDDEN_BY_DEFAULT: ColumnVisibilityState = {
  createUserString: false,
  updateUserString: false,
  updateTime: false
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
  // The search box owns its text, so resetting the filters remounts it.
  const [searchVersion, setSearchVersion] = React.useState(0)
  // One state per overlay: a null value means it is closed. The form drawer holds an object,
  // because a null id there means 新增.
  const [detailId, setDetailId] = React.useState<string | number | null>(null)
  const [formTarget, setFormTarget] = React.useState<{ tenantId: string | number | null } | null>(null)
  const [passwordTenant, setPasswordTenant] = React.useState<TenantResp | null>(null)
  const [deletingTenant, setDeletingTenant] = React.useState<TenantResp | null>(null)

  const packages = useQuery({
    queryKey: packageKeys.dicts(),
    queryFn: listPackageDict,
    staleTime: LOOKUP_STALE_MS
  })

  const packageItems = React.useMemo(
    () => [
      { value: 'all', label: '全部套餐' },
      ...(packages.data ?? []).map(option => ({ value: String(option.value), label: option.label }))
    ],
    [packages.data]
  )

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

  const handlePackageChange = React.useCallback(
    (value: string | null) => {
      setPackageId(!value || value === 'all' ? undefined : value)
      goToFirstPage()
    },
    [goToFirstPage]
  )

  const handleReset = React.useCallback(() => {
    setKeyword('')
    setPackageId(undefined)
    setSearchVersion(current => current + 1)
    goToFirstPage()
  }, [goToFirstPage])

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
    queryFn: () => listTenants(params),
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
        key={`keyword-${searchVersion}`}
        clearable
        className="col-span-2 h-8 w-full sm:w-64"
        placeholder="搜索名称、描述"
        onSearch={handleKeywordSearch}
      />
      <div className="w-full sm:w-40">
        <Select items={packageItems} value={packageId ?? 'all'} onValueChange={handlePackageChange}>
          <SelectTrigger className="w-full">
            <span className="text-muted-foreground">套餐</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectGroup>
              {packageItems.map(option => (
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
    <TenantToolbar
      table={table}
      isRefreshing={query.isFetching && !query.isPending}
      isFullscreen={fullscreen.isFullscreen}
      canCreate={canCreate}
      onCreate={() => setFormTarget({ tenantId: null })}
      onRefresh={() => void query.refetch()}
      onToggleFullscreen={fullscreen.toggleFullscreen}
      onResetColumns={() => setColumnVisibility(HIDDEN_BY_DEFAULT)}
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
        <TenantTable
          table={table}
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
