import * as React from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type ColumnVisibilityState, type PaginationState, useTable } from '@tanstack/react-table'
import { cn } from 'cn'
import { RefreshCw, Search } from 'lucide-react'

import { DataTable } from '@/components/data-table'
import { ListFilterRow } from '@/components/list-filter-row'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'
import { usePermission } from '@/hooks/use-permission'
import { listDict } from '@/lib/api/common'
import { listSmsConfig, setDefaultSmsConfig, type SmsConfigResp } from '@/lib/api/sms'
import { dataTableFeatures } from '@/lib/data-table-features'
import { reportError } from '@/lib/http'
import { dictKeys, smsKeys } from '@/lib/query-keys'

import { createSmsColumns, type SmsAction } from './columns'
import { SmsDeleteDialog } from './delete-dialog'
import { SmsFormDrawer } from './form-drawer'
import { SmsToolbar } from './toolbar'

const SUPPLIER_PRESETS = [
  { label: '阿里云', value: 'alibaba' },
  { label: '腾讯云', value: 'tencent' },
  { label: '华为云', value: 'huawei' },
  { label: '容联云', value: 'cloopen' },
  { label: '网易云信', value: 'netease' },
  { label: '亿美软通', value: 'emay' },
  { label: '助通科技', value: 'zhutong' },
  { label: '鼎佑科技', value: 'dingyou' },
  { label: '联麓信息', value: 'lianlu' },
  { label: '螺丝帽', value: 'luosimao' }
]

const HIDDEN_BY_DEFAULT: ColumnVisibilityState = {
  updateTime: false,
  createTime: false
}

const EMPTY_ROWS: SmsConfigResp[] = []

export function ConfigSms() {
  const queryClient = useQueryClient()
  const { hasPermission } = usePermission()

  const canCreate = hasPermission('system:smsConfig:create')
  const canUpdate = hasPermission('system:smsConfig:update')
  const canDelete = hasPermission('system:smsConfig:delete')
  const canSetDefault = hasPermission('system:smsConfig:setDefault')

  // Pagination & Column visibility
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>(HIDDEN_BY_DEFAULT)

  // Filters
  const [searchInput, setSearchInput] = React.useState('')
  const keyword = useDebouncedValue(searchInput).trim()
  const [filterSupplier, setFilterSupplier] = React.useState('all')

  // Drawer & Dialog states
  const [editingId, setEditingId] = React.useState<string | number | null>(null)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<SmsConfigResp | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)

  const { isFullscreen, reservedHeight, fullscreenRef, spacerRef, toggleFullscreen } = useFullscreenTransition()

  React.useEffect(() => {
    setPagination(current => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
  }, [keyword])

  // Dict query for supplier presets
  const { data: dictSuppliers = [] } = useQuery({
    queryKey: dictKeys.code('sms_supplier'),
    queryFn: ({ signal }) => listDict('sms_supplier', signal)
  })

  const supplierOptions = dictSuppliers.length > 0 ? dictSuppliers : SUPPLIER_PRESETS

  const supplierFilterOptions = React.useMemo(
    () => [{ value: 'all', label: '全部' }, ...supplierOptions],
    [supplierOptions]
  )

  const supplierMap = React.useMemo(() => {
    const map: Record<string, string> = {}
    for (const item of supplierOptions) {
      map[item.value] = item.label
    }
    return map
  }, [supplierOptions])

  // List query with pagination and filters
  const query = useQuery({
    queryKey: smsKeys.list({
      page: pagination.pageIndex + 1,
      size: pagination.pageSize,
      name: keyword || undefined,
      supplier: filterSupplier === 'all' ? undefined : filterSupplier
    }),
    queryFn: ({ signal }) =>
      listSmsConfig(
        {
          page: pagination.pageIndex + 1,
          size: pagination.pageSize,
          name: keyword || undefined,
          supplier: filterSupplier === 'all' ? undefined : filterSupplier
        },
        signal
      ),
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

  // Set default mutation
  const setDefaultMutation = useMutation({
    mutationFn: (id: string | number) => setDefaultSmsConfig(id),
    onSuccess: () => {
      toast.add({ title: '设置默认成功', type: 'success' })
      queryClient.invalidateQueries({ queryKey: smsKeys.all })
    },
    onError: err => reportError(err, '设置失败')
  })

  // Action dispatcher for table rows
  const handleRowAction = React.useCallback(
    (action: SmsAction, record: SmsConfigResp) => {
      if (action === 'edit') {
        setEditingId(record.id)
        setDrawerOpen(true)
        return
      }

      if (action === 'setDefault') {
        setDefaultMutation.mutate(record.id)
        return
      }

      if (action === 'delete') {
        setDeleteTarget(record)
        setDeleteDialogOpen(true)
      }
    },
    [setDefaultMutation]
  )

  const columns = React.useMemo(
    () => createSmsColumns(handleRowAction, rowOffset, supplierMap, canUpdate, canSetDefault, canDelete),
    [handleRowAction, rowOffset, supplierMap, canUpdate, canSetDefault, canDelete]
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

  const handleResetFilters = () => {
    setSearchInput('')
    setFilterSupplier('all')
    setPagination(current => ({ ...current, pageIndex: 0 }))
  }

  const handleCreate = () => {
    setEditingId(null)
    setDrawerOpen(true)
  }

  const tableSection = (
    <>
      <ListFilterRow
        filters={
          <>
            <InputGroup className="w-full sm:w-60">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                className="text-sm"
                placeholder="搜索配置名称"
                value={searchInput}
                onChange={event => setSearchInput(event.target.value)}
              />
            </InputGroup>

            <div className="w-full sm:w-32">
              <Select
                items={supplierFilterOptions}
                value={filterSupplier}
                onValueChange={val => {
                  setFilterSupplier(val || 'all')
                  setPagination(current => ({ ...current, pageIndex: 0 }))
                }}
              >
                <SelectTrigger className="w-full">
                  <span className="text-muted-foreground">厂商</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start" alignItemWithTrigger={false}>
                  <SelectGroup>
                    {supplierFilterOptions.map(s => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {(keyword || filterSupplier !== 'all') && (
              <Button type="button" variant="ghost" onClick={handleResetFilters}>
                <RefreshCw />
                重置
              </Button>
            )}
          </>
        }
        actions={
          <SmsToolbar
            table={table}
            isRefreshing={query.isFetching && !query.isPending}
            isFullscreen={isFullscreen}
            canCreate={canCreate}
            onCreate={handleCreate}
            onRefresh={() => void query.refetch()}
            onToggleFullscreen={toggleFullscreen}
            onResetColumns={() => setColumnVisibility(HIDDEN_BY_DEFAULT)}
          />
        }
      />

      {/* TanStack Table */}
      <DataTable
        table={table}
        isLoading={query.isPending}
        isError={query.isError}
        isShowingPreviousRows={query.isPlaceholderData}
        onRetry={() => void query.refetch()}
        skeletonWidths={['mx-auto w-6', 'w-24', 'w-16', 'w-28', 'w-20']}
      />
    </>
  )

  return (
    <>
      <Card className="pb-0">
        {/* 不需要标题部分: no CardHeader / CardTitle / CardDescription */}
        <CardContent className="flex flex-col gap-4 px-0 pb-0">
          {isFullscreen ? <div ref={spacerRef} style={{ height: reservedHeight }} /> : null}

          <div ref={fullscreenRef} className={cn('flex flex-col gap-4', isFullscreen && 'bg-background')}>
            {tableSection}
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Drawer */}
      <SmsFormDrawer
        smsId={editingId}
        open={drawerOpen}
        supplierOptions={supplierOptions}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <SmsDeleteDialog sms={deleteTarget} open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} />
    </>
  )
}
