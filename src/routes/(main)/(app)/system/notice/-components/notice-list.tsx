import * as React from 'react'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { type ColumnVisibilityState, type PaginationState, useTable } from '@tanstack/react-table'

import { Plus, RefreshCw } from 'lucide-react'

import { DataTable } from '@/components/data-table'
import { FilterSelect } from '@/components/filter-select'
import { ListPageCard } from '@/components/list-page-card'
import { TableSearch } from '@/components/table-search'
import { TableToolbar } from '@/components/table-toolbar'
import { Button } from '@/components/ui/button'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'
import { usePageClamp } from '@/hooks/use-page-clamp'
import { usePermission } from '@/hooks/use-permission'
import { listNotices, noticeKeys, type NoticeResp } from '@/lib/api/notice'
import { dataTableFeatures } from '@/lib/data-table-features'

import { createNoticeColumns, HIDDEN_BY_DEFAULT, type NoticeAction } from './notice-columns'
import { NoticeDeleteDialog } from './notice-delete-dialog'
import { NoticeDetailDrawer } from './notice-detail-drawer'
import { NoticeFormDrawer } from './notice-form-drawer'
import { NoticeViewDrawer } from './notice-view-drawer'
import { useNoticeDicts } from './use-notice-dicts'

const DEFAULT_SORT = 'id,desc'
const EMPTY_ROWS: NoticeResp[] = []

const SKELETON_WIDTHS = [
  'mx-auto w-6',
  'w-40',
  'w-16',
  'mx-auto w-16',
  'w-24',
  'mx-auto w-12 rounded-full',
  'mx-auto w-10',
  'mx-auto w-20',
  'w-28'
]

const ALL_OPTION = { value: 'all', label: '全部' }

export function NoticeList() {
  const { hasPermission } = usePermission()
  const dicts = useNoticeDicts()

  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>(HIDDEN_BY_DEFAULT)
  const [searchInput, setSearchInput] = React.useState('')
  const [keyword, setKeyword] = React.useState('')
  const [type, setType] = React.useState<string | undefined>(undefined)

  // One state per overlay: a null value means it is closed, so "which record" and "is it open" can
  // never drift apart. The form drawer holds an object, because a null id there means 新增.
  const [detailId, setDetailId] = React.useState<string | number | null>(null)
  const [viewId, setViewId] = React.useState<string | number | null>(null)
  const [formTarget, setFormTarget] = React.useState<{ noticeId: string | number | null } | null>(null)
  const [deletingNotice, setDeletingNotice] = React.useState<NoticeResp | null>(null)
  const fullscreen = useFullscreenTransition()

  const resetPage = React.useCallback(() => {
    setPagination(current => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
  }, [])

  const handleSearch = React.useCallback(
    (next: string) => {
      setKeyword(next)
      resetPage()
    },
    [resetPage]
  )

  const queryFilters = { title: keyword || undefined, type, sort: DEFAULT_SORT }
  const params = { page: pagination.pageIndex + 1, size: pagination.pageSize, ...queryFilters }

  const query = useQuery({
    queryKey: noticeKeys.list(params),
    queryFn: ({ signal }) => listNotices(params, signal),
    placeholderData: keepPreviousData
  })

  const total = query.data?.total ?? 0
  const rowOffset = pagination.pageIndex * pagination.pageSize

  usePageClamp(total, pagination, setPagination)

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
      setFormTarget({ noticeId: notice.id })
      return
    }

    setDeletingNotice(notice)
  }, [])

  const columns = React.useMemo(
    () => createNoticeColumns(dicts, handleRowAction, rowOffset),
    [dicts, handleRowAction, rowOffset]
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

  const hasActiveFilters = keyword !== '' || type !== undefined

  const handleTypeChange = (value: string | null) => {
    setType(!value || value === 'all' ? undefined : value)
    resetPage()
  }

  const resetFilters = () => {
    setSearchInput('')
    setKeyword('')
    setType(undefined)
    resetPage()
  }

  const filters = (
    <>
      <TableSearch
        className="col-span-2 h-8 w-full sm:w-64"
        value={searchInput}
        onValueChange={setSearchInput}
        onSearch={handleSearch}
        placeholder="搜索公告标题"
      />
      <FilterSelect
        label="分类"
        options={[ALL_OPTION, ...dicts.typeOptions]}
        value={type ?? 'all'}
        onValueChange={handleTypeChange}
        className="w-full sm:w-32"
      />
      {hasActiveFilters ? (
        <Button type="button" variant="ghost" onClick={resetFilters}>
          <RefreshCw />
          重置
        </Button>
      ) : null}
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
      actions={
        hasPermission('system:notice:create') && (
          <Button className="w-full sm:w-auto" onClick={() => setFormTarget({ noticeId: null })}>
            <Plus />
            新增公告
          </Button>
        )
      }
    />
  )

  return (
    <>
      <ListPageCard
        title="通知公告"
        description="发布系统通知与公告，支持定时发布、置顶和定向通知"
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
          skeletonWidths={SKELETON_WIDTHS}
        />
      </ListPageCard>

      <NoticeDetailDrawer noticeId={detailId} open={detailId !== null} onClose={() => setDetailId(null)} />
      <NoticeViewDrawer noticeId={viewId} open={viewId !== null} onClose={() => setViewId(null)} />
      <NoticeFormDrawer
        noticeId={formTarget?.noticeId ?? null}
        open={formTarget !== null}
        onClose={() => setFormTarget(null)}
      />
      <NoticeDeleteDialog
        notice={deletingNotice}
        open={deletingNotice !== null}
        onClose={() => setDeletingNotice(null)}
      />
    </>
  )
}
