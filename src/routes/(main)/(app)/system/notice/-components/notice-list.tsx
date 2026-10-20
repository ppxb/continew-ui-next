import * as React from 'react'

import { useQuery } from '@tanstack/react-query'
import { type ColumnVisibilityState, type PaginationState, useTable } from '@tanstack/react-table'

import { RefreshCw } from 'lucide-react'

import { cn } from 'cn'

import { TableSearch } from '@/components/table-search'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'
import { usePermission } from '@/hooks/use-permission'
import { listNotices, noticeKeys, type NoticeResp } from '@/lib/api/notice'
import { dataTableFeatures } from '@/lib/data-table-features'

import { createNoticeColumns, HIDDEN_BY_DEFAULT, type NoticeAction } from './notice-columns'
import { NoticeDeleteDialog } from './notice-delete-dialog'
import { NoticeDetailDrawer } from './notice-detail-drawer'
import { NoticeFormDrawer } from './notice-form-drawer'
import { NoticeTable } from './notice-table'
import { NoticeToolbar } from './notice-toolbar'
import { NoticeViewDrawer } from './notice-view-drawer'
import { useNoticeDicts } from './use-notice-dicts'

const DEFAULT_SORT = 'id,desc'
const EMPTY_ROWS: NoticeResp[] = []

export function NoticeList() {
  const { hasPermission } = usePermission()
  const { typeOptions, scopeOptions, methodOptions, statusOptions } = useNoticeDicts()

  const canCreate = hasPermission('system:notice:create')
  const canDetail = hasPermission('system:notice:get')
  const canView = hasPermission('system:notice:view')
  const canUpdate = hasPermission('system:notice:update')
  const canDelete = hasPermission('system:notice:delete')

  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>(HIDDEN_BY_DEFAULT)
  const [searchInput, setSearchInput] = React.useState('')
  const [keyword, setKeyword] = React.useState('')
  const [type, setType] = React.useState<string | undefined>(undefined)

  const [detailId, setDetailId] = React.useState<string | number | null>(null)
  const [viewId, setViewId] = React.useState<string | number | null>(null)
  const [formOpen, setFormOpen] = React.useState(false)
  const [formNoticeId, setFormNoticeId] = React.useState<string | number | null>(null)
  const [deletingNotice, setDeletingNotice] = React.useState<NoticeResp | null>(null)

  const { isFullscreen, reservedHeight, fullscreenRef, spacerRef, toggleFullscreen } = useFullscreenTransition()

  const handleSearch = React.useCallback((next: string) => {
    setKeyword(next)
    setPagination(current => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
  }, [])

  const handleTypeChange = React.useCallback((value: string | null) => {
    setType(!value || value === 'all' ? undefined : value)
    setPagination(current => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
  }, [])

  const resetFilters = React.useCallback(() => {
    setSearchInput('')
    setKeyword('')
    setType(undefined)
    setPagination(current => ({ ...current, pageIndex: 0 }))
  }, [])

  const filters = { title: keyword || undefined, type, sort: DEFAULT_SORT }
  const params = { page: pagination.pageIndex + 1, size: pagination.pageSize, ...filters }

  const query = useQuery({
    queryKey: noticeKeys.list(params),
    queryFn: () => listNotices(params),
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

  const handleRowAction = React.useCallback((action: NoticeAction, notice: NoticeResp) => {
    if (action === 'detail') {
      setDetailId(notice.id)
      return
    }

    if (action === 'view') {
      setViewId(notice.id)
      return
    }

    if (action === 'edit') {
      setFormNoticeId(notice.id)
      setFormOpen(true)
      return
    }

    setDeletingNotice(notice)
  }, [])

  const columns = React.useMemo(
    () =>
      createNoticeColumns(
        {
          typeOptions,
          scopeOptions,
          methodOptions,
          statusOptions,
          canDetail,
          canView,
          canUpdate,
          canDelete,
          onAction: handleRowAction
        },
        rowOffset
      ),
    [
      typeOptions,
      scopeOptions,
      methodOptions,
      statusOptions,
      canDetail,
      canView,
      canUpdate,
      canDelete,
      handleRowAction,
      rowOffset
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

  const typeFilterOptions = React.useMemo(() => [{ value: 'all', label: '全部' }, ...typeOptions], [typeOptions])

  const hasActiveFilters = keyword !== '' || type !== undefined

  const tableSection = (
    <>
      <div className="flex flex-wrap items-center gap-3 px-4">
        <Select items={typeFilterOptions} value={type ?? 'all'} onValueChange={handleTypeChange}>
          <SelectTrigger size="sm">
            <span className="text-muted-foreground">分类</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectGroup>
              {typeFilterOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {hasActiveFilters ? (
          <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={resetFilters}>
            <RefreshCw className="size-3.5" />
            重置
          </Button>
        ) : null}
      </div>

      <NoticeToolbar
        table={table}
        canCreate={canCreate}
        isRefreshing={query.isFetching && !query.isPending}
        isFullscreen={isFullscreen}
        onCreate={() => {
          setFormNoticeId(null)
          setFormOpen(true)
        }}
        onRefresh={() => void query.refetch()}
        onToggleFullscreen={toggleFullscreen}
        onResetColumns={() => setColumnVisibility(HIDDEN_BY_DEFAULT)}
      />

      <NoticeTable
        table={table}
        isLoading={query.isPending}
        isError={query.isError}
        isShowingPreviousRows={query.isPlaceholderData}
        onRetry={() => void query.refetch()}
      />
    </>
  )

  return (
    <>
      <Card className="pb-0">
        <CardHeader className="has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          <CardTitle className="text-xl">通知公告</CardTitle>
          <CardDescription>发布系统通知与公告，支持定时发布、置顶和定向通知</CardDescription>
          <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
            <TableSearch
              value={searchInput}
              onValueChange={setSearchInput}
              onSearch={handleSearch}
              placeholder="搜索公告标题"
            />
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 px-0">
          {isFullscreen ? <div ref={spacerRef} style={{ height: reservedHeight }} /> : null}

          <div ref={fullscreenRef} className={cn('flex flex-col gap-4', isFullscreen && 'bg-background')}>
            {tableSection}
          </div>
        </CardContent>
      </Card>

      <NoticeDetailDrawer noticeId={detailId} open={detailId !== null} onClose={() => setDetailId(null)} />
      <NoticeViewDrawer noticeId={viewId} open={viewId !== null} onClose={() => setViewId(null)} />
      <NoticeFormDrawer
        noticeId={formNoticeId}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onCompleted={() => undefined}
      />
      <NoticeDeleteDialog
        notice={deletingNotice}
        open={deletingNotice !== null}
        onClose={() => setDeletingNotice(null)}
        onCompleted={() => undefined}
      />
    </>
  )
}
