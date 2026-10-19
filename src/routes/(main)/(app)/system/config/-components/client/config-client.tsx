import * as React from 'react'

import { useQuery } from '@tanstack/react-query'
import { type ColumnVisibilityState, type PaginationState, useTable } from '@tanstack/react-table'
import { cn } from 'cn'

import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'
import { usePermission } from '@/hooks/use-permission'
import { listClient, type ClientResp } from '@/lib/api/client'
import { listDict } from '@/lib/api/common'
import { dataTableFeatures } from '@/lib/data-table-features'
import { clientKeys, dictKeys } from '@/lib/query-keys'

import {
  AUTH_TYPE_OPTIONS,
  createClientColumns,
  LOGOUT_MODE_PRESETS,
  REPLACED_RANGE_PRESETS,
  type ClientAction
} from './columns'
import { ClientDeleteDialog } from './delete-dialog'
import { ClientDetailDrawer } from './detail-drawer'
import { ClientFormDrawer } from './form-drawer'
import { ClientTable } from './table'
import { ClientToolbar } from './toolbar'

const CLIENT_TYPE_PRESETS = [
  { label: 'PC网页端', value: 'PC' },
  { label: '移动App端', value: 'APP' },
  { label: '微信小程序', value: 'MINI' },
  { label: '三方Web服务', value: 'WEB' }
]

const HIDDEN_BY_DEFAULT: ColumnVisibilityState = {
  refreshTokenTimeout: false,
  refreshTokenMode: false,
  replacedRange: false,
  maxLoginCount: false,
  overflowLogoutMode: false,
  createUserString: false,
  updateUserString: false,
  updateTime: false
}

const STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: '1', label: '启用' },
  { value: '2', label: '禁用' }
]

const EMPTY_ROWS: ClientResp[] = []

export function ConfigClient() {
  const { hasPermission } = usePermission()

  const canCreate = hasPermission('system:client:create')
  const canUpdate = hasPermission('system:client:update')
  const canDelete = hasPermission('system:client:delete')
  const canGet = hasPermission('system:client:get')

  // Pagination & Column visibility
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>(HIDDEN_BY_DEFAULT)

  // Filters
  const [clientType, setClientType] = React.useState<string | undefined>(undefined)
  const [status, setStatus] = React.useState<number | undefined>(undefined)

  // Drawer & Dialog states
  const [editingId, setEditingId] = React.useState<string | number | null>(null)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [detailTarget, setDetailTarget] = React.useState<ClientResp | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<ClientResp | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)

  const { isFullscreen, reservedHeight, fullscreenRef, spacerRef, toggleFullscreen } = useFullscreenTransition()

  // Dict queries matching Vue version: client_type, auth_type_enum, replaced_range_enum, logout_mode_enum
  const { data: dictClientTypes = [] } = useQuery({
    queryKey: dictKeys.code('client_type'),
    queryFn: () => listDict('client_type').catch(() => [])
  })

  const { data: dictAuthTypes = [] } = useQuery({
    queryKey: dictKeys.code('auth_type_enum'),
    queryFn: () => listDict('auth_type_enum').catch(() => [])
  })

  const { data: dictReplacedRanges = [] } = useQuery({
    queryKey: dictKeys.code('replaced_range_enum'),
    queryFn: () => listDict('replaced_range_enum').catch(() => [])
  })

  const { data: dictLogoutModes = [] } = useQuery({
    queryKey: dictKeys.code('logout_mode_enum'),
    queryFn: () => listDict('logout_mode_enum').catch(() => [])
  })

  const clientTypeOptions = dictClientTypes.length > 0 ? dictClientTypes : CLIENT_TYPE_PRESETS
  const authTypeOptions = dictAuthTypes.length > 0 ? dictAuthTypes : AUTH_TYPE_OPTIONS
  const replacedRangeOptions = dictReplacedRanges.length > 0 ? dictReplacedRanges : REPLACED_RANGE_PRESETS
  const logoutModeOptions = dictLogoutModes.length > 0 ? dictLogoutModes : LOGOUT_MODE_PRESETS

  const clientTypeFilterOptions = React.useMemo(
    () => [{ value: 'all', label: '全部' }, ...clientTypeOptions],
    [clientTypeOptions]
  )

  const clientTypeMap = React.useMemo(() => {
    const map: Record<string, string> = {}
    for (const item of clientTypeOptions) {
      map[item.value] = item.label
    }
    return map
  }, [clientTypeOptions])

  const authTypeMap = React.useMemo(() => {
    const map: Record<string, string> = {}
    for (const item of authTypeOptions) {
      map[item.value] = item.label
    }
    return map
  }, [authTypeOptions])

  const replacedRangeMap = React.useMemo(() => {
    const map: Record<string, string> = {}
    for (const item of replacedRangeOptions) {
      map[item.value] = item.label
    }
    return map
  }, [replacedRangeOptions])

  const logoutModeMap = React.useMemo(() => {
    const map: Record<string, string> = {}
    for (const item of logoutModeOptions) {
      map[item.value] = item.label
    }
    return map
  }, [logoutModeOptions])

  // List query with pagination and filters
  const query = useQuery({
    queryKey: clientKeys.list({
      page: pagination.pageIndex + 1,
      size: pagination.pageSize,
      clientType,
      status
    }),
    queryFn: () =>
      listClient({
        page: pagination.pageIndex + 1,
        size: pagination.pageSize,
        clientType,
        status
      }),
    placeholderData: previous => previous
  })

  const total = query.data?.total ?? 0
  const rowOffset = pagination.pageIndex * pagination.pageSize

  // Page index adjustment if total records shrinks
  React.useEffect(() => {
    if (total > 0 && pagination.pageIndex * pagination.pageSize >= total) {
      const maxPageIndex = Math.max(0, Math.ceil(total / pagination.pageSize) - 1)
      setPagination(current => ({ ...current, pageIndex: maxPageIndex }))
    }
  }, [total, pagination.pageIndex, pagination.pageSize])

  // Action dispatcher for table rows
  const handleRowAction = React.useCallback((action: ClientAction, record: ClientResp) => {
    if (action === 'detail') {
      setDetailTarget(record)
      setDetailOpen(true)
      return
    }

    if (action === 'edit') {
      setEditingId(record.id)
      setDrawerOpen(true)
      return
    }

    if (action === 'delete') {
      setDeleteTarget(record)
      setDeleteDialogOpen(true)
    }
  }, [])

  const columns = React.useMemo(
    () =>
      createClientColumns(
        handleRowAction,
        rowOffset,
        clientTypeMap,
        authTypeMap,
        replacedRangeMap,
        logoutModeMap,
        canGet,
        canUpdate,
        canDelete
      ),
    [
      handleRowAction,
      rowOffset,
      clientTypeMap,
      authTypeMap,
      replacedRangeMap,
      logoutModeMap,
      canGet,
      canUpdate,
      canDelete
    ]
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

  const handleClientTypeChange = (value: string | null) => {
    setClientType(!value || value === 'all' ? undefined : value)
    setPagination(current => ({ ...current, pageIndex: 0 }))
  }

  const handleStatusChange = (value: string | null) => {
    setStatus(!value || value === 'all' ? undefined : Number(value))
    setPagination(current => ({ ...current, pageIndex: 0 }))
  }

  const handleCreate = () => {
    setEditingId(null)
    setDrawerOpen(true)
  }

  const tableSection = (
    <>
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 px-4">
        <Select
          items={clientTypeFilterOptions}
          value={clientType === undefined ? 'all' : clientType}
          onValueChange={handleClientTypeChange}
        >
          <SelectTrigger size="sm">
            <span className="text-muted-foreground">客户端类型</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectGroup>
              {clientTypeFilterOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          items={STATUS_OPTIONS}
          value={status === undefined ? 'all' : String(status)}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger size="sm">
            <span className="text-muted-foreground">状态</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectGroup>
              {STATUS_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Toolbar */}
      <ClientToolbar
        table={table}
        isRefreshing={query.isFetching && !query.isPending}
        isFullscreen={isFullscreen}
        canCreate={canCreate}
        onCreate={handleCreate}
        onRefresh={() => void query.refetch()}
        onToggleFullscreen={toggleFullscreen}
        onResetColumns={() => setColumnVisibility(HIDDEN_BY_DEFAULT)}
      />

      {/* TanStack Table */}
      <ClientTable
        table={table}
        isLoading={query.isPending}
        isError={query.isError}
        isStale={query.isPlaceholderData}
        onRetry={() => void query.refetch()}
      />
    </>
  )

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-4 px-0">
          {isFullscreen ? <div ref={spacerRef} style={{ height: reservedHeight }} /> : null}

          <div ref={fullscreenRef} className={cn('flex flex-col gap-4', isFullscreen && 'bg-background')}>
            {tableSection}
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Drawer */}
      <ClientFormDrawer
        clientId={editingId}
        open={drawerOpen}
        clientTypeOptions={clientTypeOptions}
        authTypeOptions={authTypeOptions}
        replacedRangeOptions={replacedRangeOptions}
        logoutModeOptions={logoutModeOptions}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Detail Drawer */}
      <ClientDetailDrawer
        client={detailTarget}
        open={detailOpen}
        clientTypeMap={clientTypeMap}
        authTypeMap={authTypeMap}
        replacedRangeMap={replacedRangeMap}
        logoutModeMap={logoutModeMap}
        onClose={() => setDetailOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <ClientDeleteDialog client={deleteTarget} open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} />
    </>
  )
}
