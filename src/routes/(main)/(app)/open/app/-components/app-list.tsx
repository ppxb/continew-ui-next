import * as React from 'react'

import { useQuery } from '@tanstack/react-query'
import { type ColumnVisibilityState, type PaginationState, useTable } from '@tanstack/react-table'

import { Search, X } from 'lucide-react'

import { DataTable } from '@/components/data-table'
import { ListPageCard } from '@/components/list-page-card'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { toast } from '@/components/ui/toast'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'
import { appKeys, type AppResp, exportApps, listApps } from '@/lib/api/app'
import { dataTableFeatures } from '@/lib/data-table-features'

import { type AppAction, createAppColumns } from './app-columns'
import { AppDeleteDialog } from './app-delete-dialog'
import { AppDetailDrawer } from './app-detail-drawer'
import { AppFormDrawer } from './app-form-drawer'
import { AppResetSecretDialog } from './app-reset-secret-dialog'
import { AppSecretDialog } from './app-secret-dialog'
import { AppToolbar } from './app-toolbar'

const HIDDEN_BY_DEFAULT: ColumnVisibilityState = {
  createUserString: false,
  updateUserString: false,
  updateTime: false
}

const DEFAULT_SORT = 'id,desc'
const EMPTY_ROWS: AppResp[] = []

export function AppList() {
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>(HIDDEN_BY_DEFAULT)
  const [searchInput, setSearchInput] = React.useState('')
  const keyword = useDebouncedValue(searchInput).trim()
  const [isExporting, setIsExporting] = React.useState(false)

  // Drawer / Dialog states
  const [detailAppId, setDetailAppId] = React.useState<string | number | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [formAppId, setFormAppId] = React.useState<string | number | null>(null)
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [secretApp, setSecretApp] = React.useState<AppResp | null>(null)
  const [isSecretOpen, setIsSecretOpen] = React.useState(false)
  const [resetSecretApp, setResetSecretApp] = React.useState<AppResp | null>(null)
  const [isResetSecretOpen, setIsResetSecretOpen] = React.useState(false)
  const [deletingApp, setDeletingApp] = React.useState<AppResp | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)

  const fullscreen = useFullscreenTransition()

  React.useEffect(() => {
    setPagination(current => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
  }, [keyword])

  const query = useQuery({
    queryKey: appKeys.list({
      page: pagination.pageIndex + 1,
      size: pagination.pageSize,
      description: keyword || undefined,
      sort: DEFAULT_SORT
    }),
    queryFn: () =>
      listApps({
        page: pagination.pageIndex + 1,
        size: pagination.pageSize,
        description: keyword || undefined,
        sort: DEFAULT_SORT
      }),
    placeholderData: previous => previous
  })

  const total = query.data?.total ?? 0
  const rowOffset = pagination.pageIndex * pagination.pageSize

  // Page index bounds correction
  React.useEffect(() => {
    if (total > 0 && pagination.pageIndex * pagination.pageSize >= total) {
      const maxPageIndex = Math.max(0, Math.ceil(total / pagination.pageSize) - 1)
      setPagination(current => ({ ...current, pageIndex: maxPageIndex }))
    }
  }, [total, pagination.pageIndex, pagination.pageSize])

  const handleRowAction = React.useCallback((action: AppAction, app: AppResp) => {
    if (action === 'detail') {
      setDetailAppId(app.id)
      setIsDetailOpen(true)
      return
    }

    if (action === 'edit') {
      setFormAppId(app.id)
      setIsFormOpen(true)
      return
    }

    if (action === 'secret') {
      setSecretApp(app)
      setIsSecretOpen(true)
      return
    }

    if (action === 'resetSecret') {
      setResetSecretApp(app)
      setIsResetSecretOpen(true)
      return
    }

    if (action === 'delete') {
      setDeletingApp(app)
      setIsDeleteOpen(true)
    }
  }, [])

  const columns = React.useMemo(() => createAppColumns(handleRowAction, rowOffset), [handleRowAction, rowOffset])

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

  const handleExport = async () => {
    setIsExporting(true)

    try {
      await exportApps({ description: keyword || undefined, sort: DEFAULT_SORT })
      toast.add({ title: '导出已开始，请留意浏览器下载', type: 'success' })
    } catch {
      // The HTTP layer already reported the failure.
    } finally {
      setIsExporting(false)
    }
  }

  const handleResetSecretSuccess = (app: AppResp) => {
    setSecretApp(app)
    setIsSecretOpen(true)
  }

  const filters = (
    <InputGroup className="w-full md:w-64">
      <InputGroupAddon align="inline-start">
        <Search className="size-3.5" />
      </InputGroupAddon>
      <InputGroupInput
        className="text-sm"
        placeholder="搜索应用名称、描述"
        value={searchInput}
        onChange={event => setSearchInput(event.target.value)}
      />
      {searchInput ? (
        <InputGroupAddon align="inline-end">
          <Button type="button" variant="ghost" size="icon-xs" aria-label="清空搜索" onClick={() => setSearchInput('')}>
            <X className="size-3" />
          </Button>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  )

  const actions = (
    <AppToolbar
      table={table}
      isRefreshing={query.isFetching && !query.isPending}
      isExporting={isExporting}
      isFullscreen={fullscreen.isFullscreen}
      onCreate={() => {
        setFormAppId(null)
        setIsFormOpen(true)
      }}
      onExport={() => void handleExport()}
      onRefresh={() => void query.refetch()}
      onToggleFullscreen={fullscreen.toggleFullscreen}
      onResetColumns={() => setColumnVisibility(HIDDEN_BY_DEFAULT)}
    />
  )

  return (
    <>
      <ListPageCard
        title="应用管理"
        description="维护第三方接入应用及其访问凭证"
        filters={filters}
        actions={actions}
        fullscreen={fullscreen}
      >
        <DataTable
          table={table}
          isLoading={query.isPending}
          isError={query.isError}
          isShowingPreviousRows={query.isPlaceholderData}
          onRetry={() => void query.refetch()}
          skeletonWidths={['mx-auto w-4', 'mx-auto w-6', 'w-24', 'w-36', 'mx-auto w-12 rounded-full', 'w-24']}
        />
      </ListPageCard>

      <AppDetailDrawer appId={detailAppId} open={isDetailOpen} onClose={() => setIsDetailOpen(false)} />
      <AppFormDrawer appId={formAppId} open={isFormOpen} onClose={() => setIsFormOpen(false)} />
      <AppSecretDialog app={secretApp} open={isSecretOpen} onClose={() => setIsSecretOpen(false)} />
      <AppResetSecretDialog
        app={resetSecretApp}
        open={isResetSecretOpen}
        onClose={() => setIsResetSecretOpen(false)}
        onSuccess={handleResetSecretSuccess}
      />
      <AppDeleteDialog app={deletingApp} open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} />
    </>
  )
}
